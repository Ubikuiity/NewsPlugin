//This file contains the custom icons in svg used on the plugin.

// new icon (displays the word NEW)
export const newIc: string = `<text x="50" y="65" font-size="45" font-family="Helvetica" text-anchor="middle" fill="white">NEW</text>`;

// new synchro icon
export const newSyncIc: string = `
<text x="50" y="53" font-weight="bold" font-size="45" font-family="Helvetica" dominant-baseline="middle" text-anchor="middle" fill="white">NEW</text>
<path fill='none' stroke-width=7 stroke='white' stroke-linecap="round" d="M62.8 22.2 h16v-16"></path>
<path fill='none' stroke-width=7 stroke='white' stroke-linecap="round" d="M21.7 21.7 A 40 40 0 0 1 78.3 21.7"></path>
<path fill='none' stroke-width=7 stroke='white' stroke-linecap="round" d="M21.2 93.2 v-16h16"></path>
<path fill='none' stroke-width=7 stroke='white' stroke-linecap="round" d="M78.3 78.3 A 40 40 0 0 1 21.7 78.3"></path>
`

// broom icon, was meant to ne used for cleanup action
export const broomIcon: string = `
<path id='broom handle' fill='none' stroke-width=7 stroke='white' stroke-linecap="round" d="M 20 10 L 50 60" ></path>
<path fill='none' stroke-width=7 stroke='white' stroke-linecap="round" d="M 46.58 73.72 A 10 10 0 0 1 63.72 63.42 z" ></path>
<path id='end of brush' fill='none' stroke-width=7 stroke='white' stroke-linecap="round" d="M 46.58 73.72 
Q 54 86 64 92
Q 90 90 93 76
Q 76 74 63.72 63.42
" ></path>
<path fill='none' stroke-width=5 stroke='white' stroke-linecap="round" d="M 78 89 
Q 70 87 67 83
" ></path>
<path fill='none' stroke-width=5 stroke='white' stroke-linecap="round" d="M 88 84 
Q 78 83 73 80
" ></path>
`

// new synchro icon (legacy code)
export const formerNewSyncIc: string = `
<text x="50" y="65" font-size="45" font-family="Helvetica" text-anchor="middle" fill="white">NEW</text>
<path id='arrow-line' marker-end='url(#head)' stroke-width='5' fill='none' stroke='white'
d='M50,10
a 20,20 0 0,0 0,80
l -10, -10
l 5, 9
m 5, 1
l -10, 10
l 5, -9' />
<path id='arrow-line' marker-end='url(#head)' stroke-width='5' fill='none' stroke='white'
d='M50,90
a 20,20 0 0,0 0,-80
l 10, 10
l -5, -9
m -5, -1
l 10, -10
l -5, 9' />
`;
