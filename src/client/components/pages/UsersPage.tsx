import { UserCog, Users } from 'lucide-react'

function UsersPage() {
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">Moderators</h3>
          <Users className="h-4 w-4 text-[#ff9c75]" />
        </div>
        <div className="mt-4 space-y-3">
          {['alice', 'ben', 'chitra', 'daniel'].map((name) => (
            <div key={name} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/75">
              u/{name}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white">User tools</h3>
          <UserCog className="h-4 w-4 text-white/50" />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {['Ban review', 'Note history', 'Appeal queue', 'Warn templates'].map((tool) => (
            <div key={tool} className="rounded-2xl border border-white/8 bg-black/20 px-4 py-5 text-sm text-white/75">
              {tool}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

export default UsersPage
