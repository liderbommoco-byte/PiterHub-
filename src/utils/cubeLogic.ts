/**
 * Rubik's Cube 3x3x3 State Engine & Permutations
 * Standard 54-facelet representation:
 * Faces: U (0-8), R (9-17), F (18-26), D (27-35), L (36-44), B (45-53)
 */

export const SOLVED_STATE = 'UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB';

// Face colors standard convention
export const FACE_COLORS = {
  U: '#FFFFFF', // White
  D: '#FACC15', // Yellow
  F: '#16A34A', // Green
  B: '#2563EB', // Blue
  L: '#EA580C', // Orange
  R: '#DC2626', // Red
} as const;

export type FaceName = 'U' | 'R' | 'F' | 'D' | 'L' | 'B';

// Permutation of face itself (9 stickers) rotated 90 deg clockwise
// 0 1 2       6 3 0
// 3 4 5  -->  7 4 1
// 6 7 8       8 5 2
function rotateFaceClockwise(stickers: string[], offset: number): void {
  const [s0, s1, s2, s3, s4, s5, s6, s7, s8] = [
    stickers[offset + 0],
    stickers[offset + 1],
    stickers[offset + 2],
    stickers[offset + 3],
    stickers[offset + 4],
    stickers[offset + 5],
    stickers[offset + 6],
    stickers[offset + 7],
    stickers[offset + 8],
  ];
  stickers[offset + 0] = s6;
  stickers[offset + 1] = s3;
  stickers[offset + 2] = s0;
  stickers[offset + 3] = s7;
  stickers[offset + 4] = s4;
  stickers[offset + 5] = s1;
  stickers[offset + 6] = s8;
  stickers[offset + 7] = s5;
  stickers[offset + 8] = s2;
}

// 4-cycle cycle4(arr, i1, i2, i3, i4) moves: i4->temp, i3->i4, i2->i3, i1->i2, temp->i1
// meaning: i1 goes to i2, i2 goes to i3, i3 goes to i4, i4 goes to i1
function cycle4(arr: string[], a: number, b: number, c: number, d: number): void {
  const temp = arr[d];
  arr[d] = arr[c];
  arr[c] = arr[b];
  arr[b] = arr[a];
  arr[a] = temp;
}

export function applyMove(state: string, move: string): string {
  const s = state.split('');
  const baseMove = move[0];
  const isPrime = move.includes("'");
  const isDouble = move.includes('2');
  const turns = isDouble ? 2 : isPrime ? 3 : 1;

  for (let t = 0; t < turns; t++) {
    switch (baseMove) {
      case 'U': {
        // Face U (0..8)
        rotateFaceClockwise(s, 0);
        // Adjacent row: B top (45,46,47), R top (9,10,11), F top (18,19,20), L top (36,37,38)
        // Clockwise: L goes to F, F to R, R to B, B to L
        cycle4(s, 36, 18, 9, 45);
        cycle4(s, 37, 19, 10, 46);
        cycle4(s, 38, 20, 11, 47);
        break;
      }
      case 'D': {
        // Face D (27..35)
        rotateFaceClockwise(s, 27);
        // Adjacent row: F bottom (24,25,26), R bottom (15,16,17), B bottom (51,52,53), L bottom (42,43,44)
        // Clockwise viewed from bottom: F -> L -> B -> R -> F
        cycle4(s, 18 + 6, 36 + 6, 45 + 6, 9 + 6);
        cycle4(s, 18 + 7, 36 + 7, 45 + 7, 9 + 7);
        cycle4(s, 18 + 8, 36 + 8, 45 + 8, 9 + 8);
        break;
      }
      case 'F': {
        // Face F (18..26)
        rotateFaceClockwise(s, 18);
        // U bottom (6,7,8), R left (9,12,15), D top (27,28,29), L right (38,41,44)
        // Clockwise: U -> R -> D -> L -> U
        // Note: U(6,7,8) goes to R(9,12,15), R(9,12,15) goes to D(29,28,27), D(27,28,29) goes to L(44,41,38), L goes to U
        const u6 = s[6], u7 = s[7], u8 = s[8];
        const r9 = s[9], r12 = s[12], r15 = s[15];
        const d27 = s[27], d28 = s[28], d29 = s[29];
        const l38 = s[38], l41 = s[41], l44 = s[44];

        // U bottom -> R left
        s[9] = u6; s[12] = u7; s[15] = u8;
        // R left -> D top (inverted order)
        s[29] = r9; s[28] = r12; s[27] = r15;
        // D top -> L right
        s[44] = d29; s[41] = d28; s[38] = d27;
        // L right -> U bottom
        s[6] = l44; s[7] = l41; s[8] = l38;
        break;
      }
      case 'B': {
        // Face B (45..53)
        rotateFaceClockwise(s, 45);
        // U top (0,1,2), L left (36,39,42), D bottom (33,34,35), R right (11,14,17)
        // Clockwise viewed from back: U top -> L left -> D bottom -> R right -> U top
        const u0 = s[0], u1 = s[1], u2 = s[2];
        const l36 = s[36], l39 = s[39], l42 = s[42];
        const d33 = s[33], d34 = s[34], d35 = s[35];
        const r11 = s[11], r14 = s[14], r17 = s[17];

        s[36] = u2; s[39] = u1; s[42] = u0;
        s[35] = l36; s[34] = l39; s[33] = l42;
        s[17] = d35; s[14] = d34; s[11] = d33;
        s[2] = r17; s[1] = r14; s[0] = r11;
        break;
      }
      case 'L': {
        // Face L (36..44)
        rotateFaceClockwise(s, 36);
        // U left (0,3,6), F left (18,21,24), D left (27,30,33), B right (47,50,53) [inverted]
        const u0 = s[0], u3 = s[3], u6 = s[6];
        const f18 = s[18], f21 = s[21], f24 = s[24];
        const d27 = s[27], d30 = s[30], d33 = s[33];
        const b47 = s[47], b50 = s[50], b53 = s[53];

        // U left -> F left
        s[18] = u0; s[21] = u3; s[24] = u6;
        // F left -> D left
        s[27] = f18; s[30] = f21; s[33] = f24;
        // D left -> B right (reverse)
        s[53] = d27; s[50] = d30; s[47] = d33;
        // B right -> U left (reverse)
        s[0] = b53; s[3] = b50; s[6] = b47;
        break;
      }
      case 'R': {
        // Face R (9..17)
        rotateFaceClockwise(s, 9);
        // U right (2,5,8), B left (45,48,51) [inverted], D right (29,32,35), F right (20,23,26)
        const u2 = s[2], u5 = s[5], u8 = s[8];
        const b45 = s[45], b48 = s[48], b51 = s[51];
        const d29 = s[29], d32 = s[32], d35 = s[35];
        const f20 = s[20], f23 = s[23], f26 = s[26];

        // U right -> B left (reverse)
        s[51] = u2; s[48] = u5; s[45] = u8;
        // B left -> D right (reverse)
        s[29] = b51; s[32] = b48; s[35] = b45;
        // D right -> F right
        s[20] = d29; s[23] = d32; s[26] = d35;
        // F right -> U right
        s[2] = f20; s[5] = f23; s[8] = f26;
        break;
      }
    }
  }

  return s.join('');
}

export function isCubeSolved(state: string): boolean {
  if (state.length !== 54) return false;
  // Check each face (0..5)
  for (let face = 0; face < 6; face++) {
    const centerColor = state[face * 9 + 4];
    for (let i = 0; i < 9; i++) {
      if (state[face * 9 + i] !== centerColor) {
        return false;
      }
    }
  }
  return true;
}

export function generateScramble(length: number = 20): string[] {
  const faces = ['U', 'D', 'L', 'R', 'F', 'B'];
  const modifiers = ['', "'", '2'];
  const moves: string[] = [];
  let lastFace = '';

  for (let i = 0; i < length; i++) {
    let face = faces[Math.floor(Math.random() * faces.length)];
    while (face === lastFace) {
      face = faces[Math.floor(Math.random() * faces.length)];
    }
    lastFace = face;
    const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
    moves.push(`${face}${mod}`);
  }

  return moves;
}

export function applyMoves(initialState: string, moves: string[]): string {
  let state = initialState;
  for (const move of moves) {
    state = applyMove(state, move);
  }
  return state;
}
