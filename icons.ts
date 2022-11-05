//This file contains the custom icons in svg used on the plugin.

// new icon (displays the word NEW)
export const newIc: string = `<text x="50" y="65" font-size="45" font-family="Helvetica" text-anchor="middle" fill="white">NEW</text>`;

// new synchro icon (displays the word new with 2 circling arrows)
export const newSyncIc: string = `
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
