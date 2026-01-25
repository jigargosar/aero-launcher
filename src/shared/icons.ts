// Base64 encoded SVG icons - shared between main and renderer
// Uses btoa() which works in both Node.js 16+ and browser

const toBase64 = (svg: string): string =>
    `data:image/svg+xml;base64,${btoa(svg)}`

const createSvg = (path: string, stroke = '#aaaaaa'): string =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`

export const icons = {
    search: toBase64(createSvg('<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>')),
    calculator: toBase64(createSvg('<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="8" x2="8" y1="14" y2="14"/><line x1="8" x2="8" y1="18" y2="18"/><line x1="12" x2="12" y1="14" y2="14"/><line x1="12" x2="12" y1="18" y2="18"/><line x1="16" x2="16" y1="14" y2="18"/>')),
    calendar: toBase64(createSvg('<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>')),
    notes: toBase64(createSvg('<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/>')),
    settings: toBase64(createSvg('<circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>')),
    terminal: toBase64(createSvg('<polyline points="4,17 10,11 4,5"/><line x1="12" x2="20" y1="19" y2="19"/>')),
    folder: toBase64(createSvg('<path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/>')),
    music: toBase64(createSvg('<circle cx="8" cy="18" r="4"/><path d="M12 18V2l7 4"/>')),
    launchbar: toBase64(createSvg('<path d="m9 18 6-6-6-6"/>', '#d4872e')),
    default: toBase64(createSvg('<rect width="18" height="18" x="3" y="3" rx="2"/><path d="m9 12 2 2 4-4"/>')),
}

export type IconName = keyof typeof icons
