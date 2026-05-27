import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { context, redis, reddit } from '@devvit/web/server';
import { createPost } from '../core/post';
import type { EscalatedCase, BrigadeAlert, BrigadeSettings, AutoModRule } from '../../shared/api';

export const triggers = new Hono();

async function checkAutoMod(itemId: string, authorName: string, title: string, body: string, postId: string) {
  try {
    const subredditName = context.subredditName;
    if (!subredditName) return;

    console.log(`>>> [AUTOMOD] Checking content: ID=${itemId}, Author=${authorName}, PostID=${postId}`);
    console.log(`>>> [AUTOMOD] Content preview: ${title.substring(0, 30)} | ${body.substring(0, 50)}`);

    const rulesKey = `automod:rules:${subredditName}`;
    const rulesRaw = await redis.get(rulesKey);
    const rules: AutoModRule[] = rulesRaw ? JSON.parse(rulesRaw) : [];

    if (rules.length === 0) {
      console.log('>>> [AUTOMOD] No rules found to check.');
      return;
    }

    const fullContent = `${title} ${body}`.toLowerCase();
    
    for (const rule of rules) {
      const matchedWord = rule.blacklist.find(word => fullContent.includes(word.toLowerCase()));
      if (matchedWord) {
        console.log(`>>> [AUTOMOD] Match Found: Rule=${rule.title}, Word=${matchedWord}`);

        if (itemId.startsWith('t3_')) {
          // Action for POST
          try {
             const post = await reddit.getPostById(itemId);
             
             // 1. Assign Flair if not already assigned
             if (rule.flairId && post.linkFlair?.templateId !== rule.flairId) {
                await reddit.setPostFlair({
                  subredditName,
                  postId: itemId,
                  flairTemplateId: rule.flairId
                });
                console.log(`>>> [AUTOMOD] Applied flair ${rule.flairText} to post ${itemId}`);
             } else {
                console.log(`>>> [AUTOMOD] Flair already applied or not needed.`);
             }

             // 2. Send PM to post author
             if (authorName && authorName !== '[deleted]' && authorName !== 'anonymous') {
                try {
                  await reddit.sendPrivateMessage({
                    to: authorName,
                    subject: 'Your post contains restricted content',
                    text: `Hi u/${authorName}! Your recent post "${title}" was flagged by our automated systems for containing restricted words (${matchedWord}). A moderator flair has been applied. Please review our community guidelines.`,
                  });
                  console.log(`>>> [AUTOMOD] Sent PM to post author u/${authorName}`);
                } catch (pmErr) {
                  console.error(`>>> [AUTOMOD] Failed to send PM to u/${authorName}:`, pmErr);
                }
             }
          } catch (postErr) {
             console.error(`>>> [AUTOMOD] Failed to process post ${itemId}:`, postErr);
          }

        } else if (itemId.startsWith('t1_')) {
          // Action for COMMENT
          
          // 1. REMOVE the comment immediately
          try {
            await reddit.remove(itemId, false);
            console.log(`>>> [AUTOMOD] Comment ${itemId} REMOVED (Matched: ${matchedWord})`);
          } catch (remErr) {
            console.error(`>>> [AUTOMOD] Failed to remove comment ${itemId}:`, remErr);
          }

          // 2. Increment and check toleration limit for the POST
          // Ensure postId has t3_ prefix
          const fullPostId = postId.startsWith('t3_') ? postId : `t3_${postId}`;
          const commentCounterKey = `automod:comment_hits:${fullPostId}:${rule.id}`;
          const count = await redis.incrBy(commentCounterKey, 1);
          await redis.expire(commentCounterKey, 86400); // 24 hours

          const limit = rule.tolerationLimit || 3;
          console.log(`>>> [AUTOMOD] Rule: ${rule.title} | Post: ${fullPostId} | Hits: ${count} / Limit: ${limit}`);

          // threshold check: >= limit means lock on the hit that reaches the limit
          if (count >= limit) {
            try {
              console.log(`>>> [AUTOMOD] Attempting to LOCK post ${fullPostId}...`);
              const fullPost = await reddit.getPostById(fullPostId);
              
              // Direct lock call
              await fullPost.lock();
              console.log(`>>> [AUTOMOD] SUCCESS: Post ${fullPostId} is now LOCKED.`);

              // Send PM to thread owner
              const postOwner = fullPost.authorName;
              if (postOwner && postOwner !== '[deleted]' && postOwner !== 'anonymous') {
                try {
                  await reddit.sendPrivateMessage({
                    to: postOwner,
                    subject: 'Your thread has been locked',
                    text: `Hi u/${postOwner}! Your thread "${fullPost.title}" has been automatically locked because it reached the limit of ${limit} comments containing restricted language. This is done to maintain community standards.`,
                  });
                  console.log(`>>> [AUTOMOD] Sent PM to thread owner u/${postOwner}`);
                } catch (pmErr) {
                  console.error(`>>> [AUTOMOD] Failed to send PM to u/${postOwner}:`, pmErr);
                }
              }
            } catch (lockErr) {
              console.error(`>>> [AUTOMOD] Failed to lock post ${fullPostId}:`, lockErr);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('AutoMod detection error:', err);
  }
}

async function checkBrigade(itemId: string, type: BrigadeAlert['type'], reason: string) {
  try {
    const subredditName = context.subredditName;
    if (!subredditName) return;

    const settingsKey = `brigade:settings:${subredditName}`;
    const settingsRaw = await redis.get(settingsKey);
    const settings: BrigadeSettings = settingsRaw ? JSON.parse(settingsRaw) : {
      rapidInterval: 6,
      rapidThreshold: 5,
      newUserThreshold: 30,
      accountAgeDays: 7,
      karmaThreshold: 10,
      enabled: true,
      sendModMail: false
    };

    if (!settings.enabled) return;

    // Use a unique key for this item/type
    const windowKey = `brigade:window:${itemId}:${type}`;
    const now = Date.now();
    const windowStart = now - (settings.rapidInterval * 1000);

    // Track event in sorted set
    await redis.zAdd(windowKey, { score: now, member: `${now}-${Math.random()}` });
    await redis.zRemRangeByScore(windowKey, -Infinity, windowStart);
    
    const count = await redis.zCard(windowKey);
    await redis.expire(windowKey, settings.rapidInterval * 2);

    if (count >= settings.rapidThreshold) {
      console.log(`>>> [BRIGADE] ALERT TRIGGERED for ${itemId}: ${type} (${count} events)`);
      
      const alertsKey = `brigade:alerts:${subredditName}`;
      const alertsRaw = await redis.get(alertsKey);
      const alerts: BrigadeAlert[] = alertsRaw ? JSON.parse(alertsRaw) : [];

      // Avoid duplicate alerts for the same item/type in a short period (1 minute)
      const recentAlert = alerts.find(a => a.itemId === itemId && a.type === type && (now - new Date(a.createdAt).getTime() < 60000));
      if (recentAlert) return;

      // Track how many times this item has been brigaded
      const postCountKey = `brigade:post_count:${itemId}`;
      const postBrigadeCount = await redis.incrBy(postCountKey, 1);

      let threadTitle = 'Unknown Content';
      let permalink = '';
      try {
        if (itemId.startsWith('t3_')) {
          const post = await reddit.getPostById(itemId);
          threadTitle = post.title;
          permalink = post.permalink;
        } else if (itemId.startsWith('t1_')) {
          const comment = await reddit.getCommentById(itemId);
          permalink = comment.permalink;
          const post = await reddit.getPostById(comment.postId);
          threadTitle = post.title;
        }
      } catch (e) { console.error('Failed to get item details for alert:', e); }

      const newAlert: BrigadeAlert = {
        id: `alert_${now}`,
        itemId,
        type,
        reason: `${reason} (${count} events in ${settings.rapidInterval}s)`,
        severity: count > settings.rapidThreshold * 2 ? 'High' : 'Medium',
        createdAt: new Date().toISOString(),
        threadTitle,
        permalink,
        status: 'Live',
        postBrigadeCount
      };

      await redis.set(alertsKey, JSON.stringify([newAlert, ...alerts].slice(0, 50)));

      // Send ModMail if enabled
      if (settings.sendModMail) {
        try {
          await reddit.modMail.createModInboxConversation({
            subredditId: context.subredditId!,
            subject: `[BRIGADE ALERT] Coordinated attack detected on r/${subredditName}`,
            bodyMarkdown: `
### 🚨 High Intensity Brigade Detected
**Type:** ${type}
**Severity:** ${newAlert.severity}
**Reason:** ${newAlert.reason}
**Post:** ${threadTitle}

This post has been brigaded **${postBrigadeCount} times**.

[View Post on Reddit](https://reddit.com${permalink})

Please take immediate action in the PearlMod command center.
            `,
          });
          console.log(`>>> [SERVER] ModMail sent for brigade on ${itemId}`);
        } catch (mailErr) {
          console.error('Failed to send ModMail alert:', mailErr);
        }
      }
    }
  } catch (err) {
    console.error('Brigade detection error:', err);
  }
}

async function removeAlertForPost(postId: string) {
  try {
    const subredditName = context.subredditName;
    if (!subredditName) return;

    const alertsKey = `brigade:alerts:${subredditName}`;
    const alertsRaw = await redis.get(alertsKey);
    if (!alertsRaw) return;

    const alerts: BrigadeAlert[] = JSON.parse(alertsRaw);
    const filteredAlerts = alerts.filter(a => a.itemId !== postId);
    
    if (alerts.length !== filteredAlerts.length) {
      await redis.set(alertsKey, JSON.stringify(filteredAlerts));
      console.log(`>>> [TRIGGER] Removed brigade alerts for unlocked post: ${postId}`);
    }
  } catch (err) {
    console.error('Error removing alerts for post:', err);
  }
}

async function resolveAlertForPost(postId: string, moderatorName: string) {
  try {
    const subredditName = context.subredditName;
    if (!subredditName) return;

    const alertsKey = `brigade:alerts:${subredditName}`;
    const alertsRaw = await redis.get(alertsKey);
    if (!alertsRaw) return;

    const alerts: BrigadeAlert[] = JSON.parse(alertsRaw);
    let foundLive = false;
    
    const updatedAlerts = alerts.map(a => {
       if (a.itemId === postId && a.status === 'Live') {
          foundLive = true;
          return {
             ...a,
             status: 'Solved' as const,
             resolvedAt: new Date().toISOString(),
             resolvedBy: moderatorName,
             isLocked: true
          };
       }
       return a;
    });

    if (foundLive) {
      const solvedTotalKey = `brigade:total_solved:${subredditName}`;
      await redis.incrBy(solvedTotalKey, 1);
      await redis.set(alertsKey, JSON.stringify(updatedAlerts));
      console.log(`>>> [TRIGGER] Resolved live brigade alerts for post: ${postId} (Action by ${moderatorName})`);
    }
  } catch (err) {
    console.error('Error resolving alerts for post:', err);
  }
}

triggers.post('/on-app-install', async (c) => {
  try {
    const post = await createPost();
    const input = await c.req.json<OnAppInstallRequest>();

    return c.json<TriggerResponse>(
      {
        status: 'success',
        message: `Post created in subreddit ${context.subredditName} with id ${post.id} (trigger: ${input.type})`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<TriggerResponse>(
      {
        status: 'error',
        message: 'Failed to create post',
      },
      400
    );
  }
});

triggers.post('/mod-action', async (c) => {
  try {
    const input = await c.req.json<any>();
    const subredditName = context.subredditName;
    if (!subredditName) throw new Error('Subreddit name not found in context');

    console.log('>>> [TRIGGER] Mod Action received:', JSON.stringify(input, null, 2));

    const actionType = input.action?.toLowerCase();
    const itemId = input.targetPost?.id || input.targetComment?.id;
    const moderatorName = input.moderator?.name || 'moderator';

    console.log(`>>> [TRIGGER] Action: ${actionType}, ItemID: ${itemId}`);

    if (itemId && actionType === 'unlock') {
       await removeAlertForPost(itemId);
    }

    if (itemId && actionType === 'lock') {
       await resolveAlertForPost(itemId, moderatorName);
    }

    const resolvedActions = [
      'approvelink', 'removelink', 'approvecomment', 'removecomment',
      'confirm_ham', 'spamlink', 'spamcomment', 'banuser', 'muteuser'
    ];

    if (itemId && resolvedActions.includes(actionType)) {
      console.log(`>>> [TRIGGER] Resolved action detected on ${itemId}. Checking escalated cases...`);
      
      const casesKey = `cases:${subredditName}`;
      const casesRaw = await redis.get(casesKey);
      const cases: EscalatedCase[] = casesRaw ? JSON.parse(casesRaw) : [];

      let found = false;
      const updatedCases = cases.map(c => {
        if (c.itemId === itemId && c.status === 'Open') {
          console.log(`>>> [TRIGGER] Syncing escalated case ${c.id} to Resolved`);
          found = true;
          return { ...c, status: 'Resolved' as const };
        }
        return c;
      });

      if (found) {
        await redis.set(casesKey, JSON.stringify(updatedCases));
        console.log(`>>> [TRIGGER] Escalated cases synchronized with external mod action.`);
      }
    }

    return c.json<TriggerResponse>({ status: 'ok' }, 200);
  } catch (error) {
    console.error('>>> [TRIGGER] Mod Action Error:', error);
    return c.json<TriggerResponse>({ status: 'error', message: 'Failed to process mod action' }, 400);
  }
});

triggers.post('/on-post-update', async (c) => {
  try {
    const input = await c.req.json<any>();
    const post = input.post;

    if (post && post.isLocked === false) {
      console.log(`>>> [TRIGGER] Post ${post.id} was unlocked via Reddit UI`);
      await removeAlertForPost(post.id);
    }

    return c.json<TriggerResponse>({ status: 'ok' }, 200);
  } catch (error) {
    console.error('>>> [TRIGGER] Post Update Error:', error);
    return c.json<TriggerResponse>({ status: 'error', message: 'Failed to process post update' }, 400);
  }
});

triggers.post('/report', async (c) => {
  try {
    const input = await c.req.json<any>();
    const subredditName = context.subredditName;
    if (!subredditName) throw new Error('Subreddit name not found');

    const reason = input.reason;
    const itemId = input.post?.id || input.comment?.id;

    if (reason && itemId) {
      console.log(`>>> [TRIGGER] New report received: ${reason} for ${itemId}`);
      
      // Check for report bursts
      await checkBrigade(itemId, 'Report Burst', `Report spike: ${reason}`);

      const statsKey = `stats:reports:${subredditName}`;
      
      // Increment the counter for this specific reason
      const currentStatsRaw = await redis.get(statsKey);
      const stats = currentStatsRaw ? JSON.parse(currentStatsRaw) : {};
      stats[reason] = (stats[reason] || 0) + 1;
      
      await redis.set(statsKey, JSON.stringify(stats));

      // Track lifetime reports for the user
      if (itemId) {
        let authorName = '';
        try {
          if (itemId.startsWith('t3_')) {
            const post = await reddit.getPostById(itemId);
            authorName = post.authorName;
          } else if (itemId.startsWith('t1_')) {
            const comment = await reddit.getCommentById(itemId);
            authorName = comment.authorName;
            
            // For comment reports, check the parent post for participation spikes
            await checkBrigade(comment.postId, 'Rapid Participation', 'Spike in comment reports');
          }

          if (authorName && authorName !== '[deleted]' && authorName !== 'anonymous') {
            const userReportsKey = `stats:user-reports:${subredditName}`;
            await redis.hIncrBy(userReportsKey, authorName, 1);
            console.log(`>>> [TRIGGER] Incremented report count for u/${authorName}`);
          }
        } catch (e) {
          console.error('>>> [TRIGGER] Failed to get author for report tracking:', e);
        }
      }
    }

    return c.json<TriggerResponse>({ status: 'ok' }, 200);
  } catch (error) {
    console.error('>>> [TRIGGER] Report Error:', error);
    return c.json<TriggerResponse>({ status: 'error', message: 'Failed to process report' }, 400);
  }
});

triggers.post('/content-submit', async (c) => {
  try {
    const input = await c.req.json<any>();
    
    // Robust Extraction - PRIORITY to comment if it exists
    const comment = input.comment;
    const post = input.post;
    const author = input.author;

    // Fix: If comment exists, it's a comment submission. 
    // payloads for comments often include the post as context, so post?.id is truthy.
    const itemId = comment?.id || post?.id;
    const authorName = author?.name || post?.authorName || comment?.authorName || 'anonymous';
    
    // Content extraction
    const title = post?.title || '';
    const body = comment?.body || post?.selftext || post?.body || '';
    const postId = comment?.postId || post?.id || '';

    if (itemId) {
      const type = itemId.startsWith('t1_') ? 'COMMENT' : 'POST';
      console.log(`>>> [TRIGGER] New ${type} from u/${authorName} on ${itemId} (Thread: ${postId})`);
      
      // AutoMod Check
      await checkAutoMod(itemId, authorName, title, body, postId);

      // For comments, check the parent post for participation spikes
      const targetId = comment?.postId || itemId;
      await checkBrigade(targetId, 'Rapid Participation', 'Spike in new submissions');
    }

    return c.json<TriggerResponse>({ status: 'ok' }, 200);
  } catch (error) {
    console.error('>>> [TRIGGER] Content Submit Error:', error);
    return c.json<TriggerResponse>({ status: 'error', message: 'Failed to process content' }, 400);
  }
});
