// tk.js — shared toolkit surface for every app in the SPA.
//
// Apps should import from here instead of pulling @gesslar/toolkit
// themselves so the dependency is fetched once and everyone sees the same
// `disposer` singleton. On route change the SPA shell disposes it, which
// unwinds every `notify.on(...)` lambda that was registered against it.

import * as TK from "https://esm.sh/@gesslar/toolkit"

export const notify = TK.Notify
export const disposer = TK.Disposer
export const DisposerClass = TK.DisposerClass
export const html = TK.HTML
export const Time = TK.Time
