function Logo() {
  return (
    <div className="relative flex items-center justify-center">
      <div className="absolute inset-0 rounded-full bg-orange-400/25 blur-3xl" />
      <img
        src="/logo.png"
        alt="Logo"
        className="relative h-32 w-32 drop-shadow-[0_20px_35px_rgba(0,0,0,0.22)] sm:h-40 sm:w-40"
      />
    </div>
  )
}

export default Logo