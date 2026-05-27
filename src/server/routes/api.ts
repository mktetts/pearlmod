import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  DecrementResponse,
  IncrementResponse,
  InitResponse,
  DashboardData,
  ModQueueItem,
  ModLogEntry,
  PostDetails,
  CommentData,
  EscalatedCase,
  TrendPoint,
} from '../../shared/api';

type ErrorResponse = {
  status: 'error';
  message: string;
};

export const api = new Hono();

// Helper to fetch full post/comment tree details
async function getFullItemDetails(itemId: string): Promise<PostDetails> {
  let post;
  let fullPostId;
  
  if (itemId.startsWith('t1_')) {
    const comment = await reddit.getCommentById(itemId);
    fullPostId = (comment as any).postId;
    if (!fullPostId.startsWith('t3_')) fullPostId = `t3_${fullPostId}`;
    post = await reddit.getPostById(fullPostId);
  } else {
    fullPostId = itemId;
    if (!fullPostId.startsWith('t3_')) fullPostId = `t3_${fullPostId}`;
    post = await reddit.getPostById(fullPostId);
  }

  const commentsListing = await reddit.getComments({
    postId: fullPostId,
    limit: 500,
    pageSize: 100
  });
  const comments = await commentsListing.all();

  const commentMap: Record<string, CommentData> = {};
  const rootComments: Record<string, CommentData> = {};

  comments.forEach((comm) => {
    const fullId = comm.id.startsWith('t1_') ? comm.id : `t1_${comm.id}`;
    commentMap[fullId] = {
      id: fullId,
      authorName: comm.authorName,
      body: comm.body,
      createdAt: comm.createdAt.toISOString(),
      score: comm.score,
      parentId: comm.parentId,
      replies: [],
    };
  });

  Object.values(commentMap).forEach((comm) => {
    const parentId = comm.parentId;
    if (parentId && parentId.startsWith('t1_') && commentMap[parentId]) {
      commentMap[parentId].replies?.push(comm);
    } else {
      rootComments[comm.id] = comm;
    }
  });

  const userReportsKey = `stats:user-reports:${context.subredditName || ''}`;
  const authorReportCountRaw = await redis.hGet(userReportsKey, post.authorName);
  const authorReportCount = authorReportCountRaw ? parseInt(authorReportCountRaw, 10) : 0;

  return {
    id: post.id,
    title: post.title,
    body: post.body,
    authorName: post.authorName,
    authorReportCount,
    comments: Object.values(rootComments),
  };
}

api.get('/dashboard', async (c) => {
  try {
    const subredditName = context.subredditName;
    if (!subredditName) throw new Error('Subreddit name not found in context');

    let username = await reddit.getCurrentUsername();
    
    // FALLBACK: If username is missing but userId is present, try to fetch it
    if (!username && context.userId) {
      console.log(`>>> [SERVER] Username null, attempting fallback for userId: ${context.userId}`);
      try {
        const user = await reddit.getUserById(context.userId);
        username = user?.username;
      } catch (e) {
        console.error(`>>> [SERVER] Fallback fetch failed for ${context.userId}:`, e);
      }
    }

    // Permission Check: Ensure user is a moderator
    let isModerator = false;
    let allMods: any[] = [];
    
    // Fetch all moderators once
    const moderators = await reddit.getModerators({ subredditName });
    allMods = await moderators.all();

    if (username) {
      isModerator = allMods.some(m => m.username === username);
    }
    
    // Extra safety: Check by userId if username match failed but we have userId
    if (!isModerator && context.userId) {
       isModerator = allMods.some(m => (m as any).id === context.userId || (m as any).userId === context.userId);
    }

    if (!isModerator) {
      console.warn(`>>> [SERVER] Unauthorized access attempt to dashboard by ${username || 'anonymous'} (UID: ${context.userId || 'none'})`);
      return c.json({ status: 'error', message: 'Access Denied: You must be a moderator to view this data.' }, 403);
    }

    // Since we checked isModerator, username must exist (or we matched by ID)
    if (!username && context.userId) {
       // If we matched by ID but still don't have username, it's weird but we should allow it if they are a mod
       console.log(">>> [SERVER] Mod matched by ID, but username still missing.");
    }
    
    const finalUsername = username || 'moderator';

    let subreddit;
    try {
      subreddit = await reddit.getSubredditByName(subredditName);
    } catch (apiErr) {
      console.error('>>> [SERVER] Core Reddit API Fetch Error:', apiErr);
      throw new Error(`Failed to fetch core subreddit data: ${apiErr instanceof Error ? apiErr.message : 'Unknown error'}`);
    }

    const moderatorInfos = await Promise.all(
      allMods.map(async (m) => {
        const permissions = await m.getModPermissionsForSubreddit(subredditName);
        return { username: m.username, permissions: Array.isArray(permissions) ? permissions : [] };
      })
    );

    // Fetch escalated cases from Redis
    const casesKey = `cases:${subredditName}`;
    const casesRaw = await redis.get(casesKey);
    const allCases: EscalatedCase[] = casesRaw ? JSON.parse(casesRaw) : [];

    const userReportsKey = `stats:user-reports:${subredditName}`;
    const userReportsRaw = await redis.hGetAll(userReportsKey);
    const userReportsMap: Record<string, number> = {};
    for (const [u, v] of Object.entries(userReportsRaw)) {
      userReportsMap[u] = parseInt(v, 10) || 0;
    }

    const visibleCases = await Promise.all(
      allCases
        .filter(c => c.assignee === username || c.assignee === `u/${username}`)
        .map(async (c) => {
          const analysisKey = `analysis:case_${c.id}`;
          const analysisRaw = await redis.get(analysisKey);
          const analysis = analysisRaw ? JSON.parse(analysisRaw) : null;
          
          return {
            ...c,
            authorReportCount: userReportsMap[c.snapshot?.authorName || ''] || 0,
            aiCategory: analysis?.category,
            aiScore: analysis?.score,
            aiEvidence: analysis?.evidence,
          };
        })
    );

    const modQueueItems = await subreddit.getModQueue();
    const allModQueueItems = await modQueueItems.all();

    const escalatedItemIds = new Set(allCases.filter(c => c.status === 'Open').map(c => c.itemId));

    const modQueue: ModQueueItem[] = await Promise.all(
      allModQueueItems
        .filter(item => !escalatedItemIds.has(item.id))
        .map(async (item: any) => {
          const lockKey = `lock:${item.id}`;
          const analysisKey = `analysis:${item.id}`;
          const [lockedBy, analysisRaw] = await Promise.all([
            redis.get(lockKey),
            redis.get(analysisKey)
          ]);
          
          const analysis = analysisRaw ? JSON.parse(analysisRaw) : null;

          return {
            id: item.id,
            authorName: item.authorName || 'anonymous',
            authorReportCount: userReportsMap[item.authorName] || 0,
            body: item.body || '',
            title: item.title,
            createdAt: new Date(item.createdAt).toISOString(),
            permalink: item.permalink,
            userReportReasons: item.userReportReasons || [],
            modReportReasons: item.modReportReasons || [],
            numReports: item.numReports || 0,
            isLockedBy: lockedBy,
            aiCategory: analysis?.category,
            aiScore: analysis?.score,
            aiEvidence: analysis?.evidence,
          };
        })
    );

    // Fetch moderation log
    const modLog = await reddit.getModerationLog({ subredditName, limit: 100 }).all();
    const resolvedActions = ['approvelink', 'removelink', 'approvecomment', 'removecomment', 'confirm_ham', 'spamlink', 'spamcomment', 'banuser', 'muteuser', 'lock', 'unlock', 'removespam'];
    const resolvedLogs = modLog.filter((log) => {
      const actionType = (log as any).type || (log as any).action;
      return actionType && resolvedActions.includes(actionType.toLowerCase());
    });

    const historyKey = `history:${subredditName}`;
    const localHistoryRaw = await redis.get(historyKey);
    const localHistory: ModLogEntry[] = localHistoryRaw ? JSON.parse(localHistoryRaw) : [];

    const combinedLog: ModLogEntry[] = [];
    const handledItemIds = new Set<string>();

    localHistory.forEach(entry => {
      combinedLog.push(entry);
      handledItemIds.add(entry.id);
    });

    resolvedLogs.forEach(log => {
      if (!handledItemIds.has(log.id)) {
        combinedLog.push({
          id: log.id,
          type: (log as any).type || (log as any).action,
          moderatorName: log.moderatorName,
          createdAt: new Date(log.createdAt).toISOString(),
          targetTitle: (log.target as any)?.title || (log.target as any)?.body?.substring(0, 50) || 'Moderated Content',
          targetAuthor: (log.target as any)?.author,
        });
      }
    });

    // Generate trend data
    const trend: TrendPoint[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();
      const dateStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      const dateEnd = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
      const resolvedOnDay = resolvedLogs.filter((log) => {
        const logDate = new Date(log.createdAt);
        return logDate >= dateStart && logDate <= dateEnd;
      }).length;
      const pendingShare = i === 0 ? modQueue.length : Math.floor(modQueue.length / 7);
      trend.push({
        label: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
        resolved: resolvedOnDay,
        cases: resolvedOnDay + pendingShare,
      });
    }

    // Fetch report stats
    const statsKey = `stats:reports:${subredditName}`;
    const statsRaw = await redis.get(statsKey);
    const persistentStats: Record<string, number> = statsRaw ? JSON.parse(statsRaw) : {};
    const standardCategories = ['Harassment', 'Threatening violence', 'Hate', 'Minor abuse or sexualization', 'Sharing personal information', 'Non-consensual intimate media', 'Prohibited transaction', 'Impersonation', 'Manipulated Content', 'Copyright violation', 'Trademark violation', 'Self-harm or suicide', 'Spam', 'Community interference', 'Report abuse'];
    const reportStats = { ...persistentStats };
    standardCategories.forEach(cat => { if (!(cat in reportStats)) reportStats[cat] = 0; });
    modQueue.forEach(item => {
      const allReasons = [...item.userReportReasons, ...item.modReportReasons];
      allReasons.forEach(reason => {
        const match = standardCategories.find(cat => reason.toLowerCase().includes(cat.toLowerCase()));
        const key = match || reason;
        reportStats[key] = (reportStats[key] || 0) + 1;
      });
    });

    // Leaderboard
    const leaderboardMap: Record<string, { solved: number, cases: number }> = {};
    allMods.forEach(m => { if (m.username !== 'pearlmod') leaderboardMap[m.username] = { solved: 0, cases: 0 }; });
    combinedLog.forEach(log => { if (leaderboardMap[log.moderatorName]) leaderboardMap[log.moderatorName].solved++; });
    allCases.forEach(c => {
      const assignee = c.assignee.replace('u/', '');
      if (c.status === 'Resolved' && leaderboardMap[assignee]) leaderboardMap[assignee].cases++;
    });
    const leaderboard = Object.entries(leaderboardMap).map(([username, stats]) => ({
      username,
      solvedCount: stats.solved,
      caseCount: stats.cases,
      total: stats.solved + stats.cases
    })).sort((a, b) => b.total - a.total);

    // Fetch Flair Templates
    const [rawPostFlairs, rawUserFlairs] = await Promise.all([
      subreddit.getPostFlairTemplates(),
      subreddit.getUserFlairTemplates()
    ]);
    
    const postFlairs = rawPostFlairs.map(f => ({
      id: f.id,
      type: 'post' as const,
      text: f.text,
      backgroundColor: f.backgroundColor,
      textColor: f.textColor,
      modOnly: f.modOnly
    }));

    const userFlairs = rawUserFlairs.map(f => ({
      id: f.id,
      type: 'user' as const,
      text: f.text,
      backgroundColor: f.backgroundColor,
      textColor: f.textColor,
      modOnly: f.modOnly
    }));

    const flairStatsKey = `stats:flairs:${subredditName}`;
    const flairStatsRaw = await redis.hGetAll(flairStatsKey);
    const flairStats: Record<string, number> = {};
    for (const [k, v] of Object.entries(flairStatsRaw)) {
      flairStats[k] = parseInt(v, 10) || 0;
    }

    // Fetch Brigade Data
    const alertsKey = `brigade:alerts:${subredditName}`;
    const alertsRaw = await redis.get(alertsKey);
    let brigadeAlerts: BrigadeAlert[] = alertsRaw ? JSON.parse(alertsRaw) : [];
    
    // Migration: ensure status exists
    brigadeAlerts = brigadeAlerts.map(a => ({ ...a, status: a.status || 'Live' }));

    const settingsKey = `brigade:settings:${subredditName}`;
    const settingsRaw = await redis.get(settingsKey);
    const brigadeSettings: BrigadeSettings = settingsRaw ? JSON.parse(settingsRaw) : {
      rapidInterval: 6,
      rapidThreshold: 5,
      newUserThreshold: 30,
      accountAgeDays: 7,
      karmaThreshold: 10,
      enabled: true,
      sendModMail: false
    };

    const solvedTotalKey = `brigade:total_solved:${subredditName}`;
    const solvedTotalRaw = await redis.get(solvedTotalKey);
    const totalSolvedCount = solvedTotalRaw ? parseInt(solvedTotalRaw, 10) : 0;

    // Fetch Banned Users
    const bannedUsersRaw = await reddit.getBannedUsers({ subredditName, limit: 100 }).all();
    const bannedUsers = bannedUsersRaw.map(b => ({
      id: b.id,
      username: b.username,
      date: new Date(b.date).toISOString(),
      reason: b.reason,
      note: b.note,
      daysLeft: b.daysLeft,
    }));

    // Fetch AutoMod Rules
    const rulesKey = `automod:rules:${subredditName}`;
    const rulesRaw = await redis.get(rulesKey);
    const autoModRules: AutoModRule[] = rulesRaw ? JSON.parse(rulesRaw) : [];

    const response: DashboardData = {
      moderatorCount: allMods.length,
      modQueueCount: modQueue.length,
      resolvedCount: combinedLog.length,
      moderators: moderatorInfos,
      trend: trend,
      modQueue: modQueue,
      modLog: combinedLog,
      cases: visibleCases,
      reportStats,
      leaderboard,
      postFlairs,
      userFlairs,
      flairStats,
      bannedUsers,
      brigadeAlerts,
      brigadeSettings,
      autoModRules,
      totalSolvedCount
    };
    return c.json<DashboardData>(response);
  } catch (error) {
    return c.json({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

api.post('/automod-rule', async (c) => {
  try {
    const { title, blacklist, flairId, flairText, tolerationLimit } = await c.req.json<Partial<AutoModRule>>();
    const subredditName = context.subredditName;
    const username = await reddit.getCurrentUsername();
    if (!subredditName || !username) throw new Error('Unauthorized');

    const rulesKey = `automod:rules:${subredditName}`;
    const rulesRaw = await redis.get(rulesKey);
    const rules: AutoModRule[] = rulesRaw ? JSON.parse(rulesRaw) : [];
    
    const newRule: AutoModRule = {
      id: `rule_${Date.now()}`,
      title: title || 'Untitled Rule',
      blacklist: blacklist || [],
      flairId,
      flairText,
      tolerationLimit: tolerationLimit || 3,
      createdAt: new Date().toISOString(),
      createdBy: username,
    };

    await redis.set(rulesKey, JSON.stringify([newRule, ...rules]));
    return c.json({ status: 'success', rule: newRule });
  } catch (error) {
    return c.json({ status: 'error', message: 'Failed to create rule' }, 400);
  }
});

api.post('/brigade-settings', async (c) => {
  try {
    const subredditName = context.subredditName;
    const username = await reddit.getCurrentUsername();
    if (!subredditName || !username) throw new Error('Unauthorized');
    
    // Check moderator status
    const mods = await reddit.getModerators({ subredditName }).all();
    if (!mods.some(m => m.username === username)) throw new Error('Forbidden');

    const settings = await c.req.json<BrigadeSettings>();
    const settingsKey = `brigade:settings:${subredditName}`;
    await redis.set(settingsKey, JSON.stringify(settings));
    
    return c.json({ status: 'success' });
  } catch (error) {
    return c.json({ status: 'error', message: 'Failed to update settings' }, 400);
  }
});

api.post('/brigade-moderation', async (c) => {
  try {
    const { itemId, action, level, alertId } = await c.req.json<{ itemId: string; action: 'lock' | 'unlock' | 'crowdControl'; level?: any; alertId?: string }>();
    const subredditName = context.subredditName;
    const username = await reddit.getCurrentUsername();
    if (!subredditName || !username) throw new Error('Unauthorized');

    const post = await reddit.getPostById(itemId);
    
    if (action === 'lock') {
      await post.lock();
    } else if (action === 'unlock') {
      await post.unlock();
    } else if (action === 'crowdControl' && level) {
      await post.updateCrowdControlLevel(level);
    }

    if (alertId) {
      const alertsKey = `brigade:alerts:${subredditName}`;
      const alertsRaw = await redis.get(alertsKey);
      const alerts: BrigadeAlert[] = alertsRaw ? JSON.parse(alertsRaw) : [];
      
      let updatedAlerts;
      if (action === 'unlock') {
        // Remove from queue entirely if unlocked
        updatedAlerts = alerts.filter(a => a.id !== alertId);
      } else {
        const targetAlert = alerts.find(a => a.id === alertId);
        // Only increment if we are solving a 'Live' alert
        if (targetAlert && targetAlert.status === 'Live') {
           const solvedTotalKey = `brigade:total_solved:${subredditName}`;
           await redis.incrBy(solvedTotalKey, 1);
        }

        updatedAlerts = alerts.map(a => {
          if (a.id === alertId) {
            return { 
              ...a, 
              status: 'Solved' as const, 
              resolvedAt: new Date().toISOString(), 
              resolvedBy: username,
              isLocked: action === 'lock' ? true : a.isLocked,
              crowdControlLevel: action === 'crowdControl' ? level : a.crowdControlLevel
            };
          }
          return a;
        });
      }
      await redis.set(alertsKey, JSON.stringify(updatedAlerts));
    }

    return c.json({ status: 'success' });
  } catch (error) {
    console.error('Brigade mod error:', error);
    return c.json({ status: 'error', message: 'Moderation action failed' }, 400);
  }
});

api.post('/resolve-brigade', async (c) => {
  try {
    const { alertId } = await c.req.json<{ alertId: string }>();
    const subredditName = context.subredditName;
    const username = await reddit.getCurrentUsername();
    if (!subredditName || !username) throw new Error('Unauthorized');

    const alertsKey = `brigade:alerts:${subredditName}`;
    const alertsRaw = await redis.get(alertsKey);
    const alerts: BrigadeAlert[] = alertsRaw ? JSON.parse(alertsRaw) : [];
    const updatedAlerts = alerts.map(a => a.id === alertId ? { ...a, status: 'Solved' as const, resolvedAt: new Date().toISOString(), resolvedBy: username } : a);
    await redis.set(alertsKey, JSON.stringify(updatedAlerts));
    
    return c.json({ status: 'success' });
  } catch (error) {
    return c.json({ status: 'error', message: 'Failed to resolve' }, 400);
  }
});

api.post('/save-analysis', async (c) => {
  try {
    const { itemId, analysis } = await c.req.json<{ itemId: string; analysis: any }>();
    await redis.set(`analysis:${itemId}`, JSON.stringify(analysis));
    return c.json({ status: 'success' });
  } catch (error) {
    return c.json({ status: 'error', message: 'Failed to save analysis' }, 400);
  }
});

api.get('/post-details/:itemId', async (c) => {
  try {
    const itemId = c.req.param('itemId');
    const response = await getFullItemDetails(itemId);
    return c.json(response);
  } catch (error) {
    return c.json({ status: 'error', message: 'Details failed' }, 400);
  }
});

api.post('/flair-template', async (c) => {
  try {
    const { type, text, backgroundColor, textColor, modOnly } = await c.req.json();
    const subredditName = context.subredditName;
    if (!subredditName) throw new Error('No subreddit context');

    const options = {
      subredditName,
      text,
      backgroundColor: backgroundColor || 'transparent',
      textColor: textColor || 'dark',
      modOnly: !!modOnly,
      allowUserEdits: false,
    };

    let result;
    if (type === 'post') {
      result = await reddit.createPostFlairTemplate(options);
    } else {
      result = await reddit.createUserFlairTemplate(options);
    }

    return c.json({ status: 'success', flair: { ...options, id: result.id, type } });
  } catch (error) {
    return c.json({ status: 'error', message: 'Failed to create flair template' }, 400);
  }
});

api.post('/delete-flair-template', async (c) => {
  try {
    const { id } = await c.req.json();
    const subredditName = context.subredditName;
    if (!subredditName) throw new Error('No subreddit context');

    await reddit.deleteFlairTemplate(subredditName, id);
    return c.json({ status: 'success' });
  } catch (error) {
    return c.json({ status: 'error', message: 'Failed to delete flair template' }, 400);
  }
});

api.post('/moderation-action', async (c) => {
  try {
    const { itemId, action, reason, caseId, assignFlairId, assignFlairType } = await c.req.json<{ itemId: string; action: 'approve' | 'remove' | 'spam'; reason?: string; caseId?: string; assignFlairId?: string; assignFlairType?: 'post' | 'user' }>();
    const username = await reddit.getCurrentUsername();
    const subredditName = context.subredditName;
    if (!username || !subredditName) throw new Error('Missing user or context');
    let targetTitle = 'Content';
    let targetAuthor = 'anonymous';

    if (itemId.startsWith('t3_')) {
      const post = await reddit.getPostById(itemId);
      targetTitle = post.title;
      targetAuthor = post.authorName;
      if (action === 'approve') await post.approve();
      else {
        await post.remove(action === 'spam');
        if (reason) await reddit.submitComment({ id: itemId, text: `Removed: ${reason}` });
      }
      
      // Assign post flair if requested
      if (assignFlairId && assignFlairType === 'post') {
        await reddit.setPostFlair({ subredditName, postId: itemId, flairTemplateId: assignFlairId });
        await redis.hIncrBy(`stats:flairs:${subredditName}`, assignFlairId, 1);
      }
    } else if (itemId.startsWith('t1_')) {
      const comment = await reddit.getCommentById(itemId);
      targetTitle = comment.body.substring(0, 50);
      targetAuthor = comment.authorName;
      if (action === 'approve') await comment.approve();
      else {
        await comment.remove(action === 'spam');
        if (reason) await reddit.submitComment({ id: itemId, text: `Removed: ${reason}` });
      }
    }
    
    // Assign user flair if requested (applies to both post and comment authors)
    if (assignFlairId && assignFlairType === 'user' && targetAuthor !== 'anonymous' && targetAuthor !== '[deleted]') {
      await reddit.setUserFlair({ subredditName, username: targetAuthor, flairTemplateId: assignFlairId });
      await redis.hIncrBy(`stats:flairs:${subredditName}`, assignFlairId, 1);
    }

    if (subredditName) {
      const historyKey = `history:${subredditName}`;
      const localHistoryRaw = await redis.get(historyKey);
      const localHistory: ModLogEntry[] = localHistoryRaw ? JSON.parse(localHistoryRaw) : [];
      const newEntry: ModLogEntry = { id: itemId, type: action, moderatorName: username, createdAt: new Date().toISOString(), targetTitle, targetAuthor };
      await redis.set(historyKey, JSON.stringify([newEntry, ...localHistory].slice(0, 50)));
      if (caseId) {
        const casesKey = `cases:${subredditName}`;
        const casesRaw = await redis.get(casesKey);
        const cases: EscalatedCase[] = casesRaw ? JSON.parse(casesRaw) : [];
        const updatedCases = cases.map(c => c.id === caseId ? { ...c, status: 'Resolved' as const } : c);
        await redis.set(casesKey, JSON.stringify(updatedCases));
      }
    }
    await redis.del(`lock:${itemId}`);
    return c.json({ status: 'success' });
  } catch (error) {
    return c.json({ status: 'error', message: 'Action failed' }, 400);
  }
});

api.post('/ban-user', async (c) => {
  try {
    const { username, reason, note, message, duration, context: banContext } = await c.req.json<{ username: string, reason: string, note?: string, message?: string, duration?: number, context?: string }>();
    const subredditName = context.subredditName;
    if (!subredditName) throw new Error('No subreddit context');

    if (!username || username === 'anonymous' || username === '[deleted]') {
      throw new Error(`Cannot ban user: ${username}`);
    }

    console.log(`>>> [SERVER] Attempting to ban u/${username} for: ${reason}`);

    await reddit.banUser({
      subredditName,
      username,
      reason,
      note,
      message,
      duration: duration || 0,
      context: banContext
    });

    try {
      const messageText = `You were banned from r/${subredditName} for the following reason: ${reason}.${banContext ? ` The context post/comment ID is: ${banContext}.` : ''}`;
      
      await reddit.sendPrivateMessage({
        to: username,
        subject: `You have been banned from r/${subredditName}`,
        text: messageText,
      });
      console.log(`>>> [SERVER] Sent ban notification to u/${username}`);
    } catch (msgErr) {
      console.error(`>>> [SERVER] Failed to send ban notification to u/${username}:`, msgErr);
    }

    console.log(`>>> [SERVER] Successfully banned u/${username}`);
    return c.json({ status: 'success' });
  } catch (error) {
    console.error('>>> [SERVER] Ban failed:', error);
    return c.json({ status: 'error', message: error instanceof Error ? error.message : 'Failed to ban user' }, 400);
  }
});

api.post('/unban-user', async (c) => {
  try {
    const { username } = await c.req.json<{ username: string }>();
    const subredditName = context.subredditName;
    if (!subredditName) throw new Error('No subreddit context');

    await reddit.unbanUser(username, subredditName);
    return c.json({ status: 'success' });
  } catch (error) {
    return c.json({ status: 'error', message: 'Failed to unban user' }, 400);
  }
});

api.post('/create-case', async (c) => {
  try {
    const { itemId, title, description, priority, assignee } = await c.req.json<{ itemId: string; title: string; description: string; priority: any; assignee: string }>();
    const username = await reddit.getCurrentUsername();
    const subredditName = context.subredditName;
    if (!username || !subredditName) throw new Error('Missing context');
    const snapshot = await getFullItemDetails(itemId);
    const casesKey = `cases:${subredditName}`;
    const casesRaw = await redis.get(casesKey);
    const cases: EscalatedCase[] = casesRaw ? JSON.parse(casesRaw) : [];
    const newCase: EscalatedCase = { id: `case_${Date.now()}`, itemId, title, description, priority, assignee, status: 'Open', createdAt: new Date().toISOString(), createdBy: username, subreddit: subredditName, snapshot };
    await redis.set(casesKey, JSON.stringify([newCase, ...cases]));
    try {
      const link = `https://reddit.com/r/${subredditName}/comments/${itemId.replace('t3_', '')}`;
      await reddit.modMail.createConversation({
        subredditName: subredditName,
        subject: `[ACTION REQUIRED] Escalation: ${title}`,
        body: `New Case: ${title}\n[View](${link})`,
        to: assignee, 
      });
    } catch (e) { console.error('Mail error:', e); }
    return c.json({ status: 'success', case: newCase });
  } catch (error) {
    return c.json({ status: 'error', message: 'Case failed' }, 400);
  }
});

api.post('/update-case-status', async (c) => {
  try {
    const { caseId, status } = await c.req.json<{ caseId: string; status: 'Open' | 'Resolved' | 'Closed' }>();
    const subredditName = context.subredditName;
    if (!subredditName) throw new Error('Subreddit name not found');
    const casesKey = `cases:${subredditName}`;
    const casesRaw = await redis.get(casesKey);
    const cases: EscalatedCase[] = casesRaw ? JSON.parse(casesRaw) : [];
    const updatedCases = cases.map(c => c.id === caseId ? { ...c, status } : c);
    await redis.set(casesKey, JSON.stringify(updatedCases));
    return c.json({ status: 'success' });
  } catch (error) {
    return c.json({ status: 'error', message: 'Update failed' }, 400);
  }
});

api.post('/lock', async (c) => {
  try {
    const { itemId, unlock } = await c.req.json<{ itemId: string; unlock?: boolean }>();
    const username = await reddit.getCurrentUsername();
    const lockKey = `lock:${itemId}`;
    if (unlock) {
      const lockedBy = await redis.get(lockKey);
      if (lockedBy === username) await redis.del(lockKey);
    } else {
      await redis.set(lockKey, username, { expiration: new Date(Date.now() + 30 * 60 * 1000) });
    }
    return c.json({ status: 'success' });
  } catch (error) {
    return c.json({ status: 'error', message: 'Lock error' }, 400);
  }
});

api.get('/init', async (c) => {
  const { postId, subredditName, userId } = context;
  if (!postId) return c.json({ status: 'error', message: 'postId is required' }, 400);
  try {
    let [count, username] = await Promise.all([redis.get('count'), reddit.getCurrentUsername()]);
    
    // FALLBACK: If username is missing but userId is present
    if (!username && userId) {
      try {
        const user = await reddit.getUserById(userId);
        username = user?.username;
      } catch (e) {
        console.error(`>>> [SERVER] Init fallback failed for ${userId}:`, e);
      }
    }

    let isModerator = false;
    if (subredditName && (username || userId)) {
      try {
        const mods = await reddit.getModerators({ subredditName }).all();
        if (username) {
          isModerator = mods.some(m => m.username === username);
        }
        if (!isModerator && userId) {
          isModerator = mods.some(m => (m as any).id === userId || (m as any).userId === userId);
        }
      } catch (e) {
        console.error(`>>> [SERVER] Error checking moderator status:`, e);
      }
    }

    return c.json<InitResponse>({ 
      type: 'init', 
      postId, 
      count: count ? parseInt(count) : 0, 
      username: username ?? 'anonymous',
      isModerator
    });
  } catch (error) {
    return c.json({ status: 'error', message: 'Initialization failed' }, 400);
  }
});

api.post('/increment', async (c) => {
  const { postId } = context;
  const count = await redis.incrBy('count', 1);
  return c.json({ count, postId, type: 'increment' });
});

api.post('/decrement', async (c) => {
  const { postId } = context;
  const count = await redis.incrBy('count', -1);
  return c.json({ count, postId, type: 'decrement' });
});
