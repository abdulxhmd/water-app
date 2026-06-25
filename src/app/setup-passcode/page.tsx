export default function SetupPasscodePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[#F7FAFF] p-6 text-slate-800 dark:bg-gradient-to-br dark:from-[#f3ecff] dark:via-[#e8f5ff] dark:to-[#e8fff1] dark:text-slate-800">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-60">
        <div className="absolute left-[-10%] top-[-20%] h-[60%] w-[60%] rounded-full bg-[#eef4f8] blur-[120px] dark:bg-[#7FB8FF]/10" />
        <div className="absolute bottom-[-20%] right-[-10%] h-[60%] w-[60%] rounded-full bg-[#fcf5f0] blur-[120px] dark:bg-orange-100/10" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-2xl border border-white/50 bg-white/80 p-10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] backdrop-blur-sm dark:border-white/5 dark:bg-[#eef7ff]/80 md:p-12">
          <div className="mb-10 text-center">
            <h1 className="text-3xl font-medium leading-tight text-slate-800 dark:text-slate-800 md:text-4xl">
              Choose a passcode
              <br />
              only you will know.
            </h1>
            <p className="mt-4 text-sm font-light text-slate-500 dark:text-slate-500">
              A small secret, kept just for you.
            </p>
          </div>

          <form className="space-y-10">
            <div className="flex justify-center gap-4">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                autoFocus
                className="h-14 w-12 border-b-2 border-slate-200 bg-transparent text-center text-2xl font-light text-slate-800 focus:border-[#7FB8FF] focus:outline-none dark:border-[#dbe6f2] dark:text-slate-800"
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                className="h-14 w-12 border-b-2 border-slate-200 bg-transparent text-center text-2xl font-light text-slate-800 focus:border-[#7FB8FF] focus:outline-none dark:border-[#dbe6f2] dark:text-slate-800"
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                className="h-14 w-12 border-b-2 border-slate-200 bg-transparent text-center text-2xl font-light text-slate-800 focus:border-[#7FB8FF] focus:outline-none dark:border-[#dbe6f2] dark:text-slate-800"
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                className="h-14 w-12 border-b-2 border-slate-200 bg-transparent text-center text-2xl font-light text-slate-800 focus:border-[#7FB8FF] focus:outline-none dark:border-[#dbe6f2] dark:text-slate-800"
              />
            </div>

            <div className="flex flex-col items-center gap-4 pt-2">
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-[#9cc7ff] via-[#c5b4ff] to-[#b9f0d2] py-3 text-sm font-medium text-white shadow-[0_12px_28px_rgba(127,184,255,0.35)] transition-all hover:from-[#8fbfff] hover:via-[#b8a8ff] hover:to-[#aeecc7] hover:shadow-md"
              >
                Begin
              </button>
            </div>
          </form>
        </div>

        <div className="mt-8 text-center opacity-60 transition-opacity hover:opacity-100">
          <button
            type="button"
            className="text-xs text-slate-500 transition-colors hover:text-[#7FB8FF] dark:text-slate-500"
          >
            I&apos;d rather not set a code
          </button>
        </div>
      </div>
    </main>
  );
}



