const STYLE = {
  white: {
    fill: '#ffffff',
    stroke: '#1a1a1a',
    detail: '#1a1a1a',
  },
  black: {
    fill: '#1a1a1a',
    stroke: '#1a1a1a',
    detail: '#f2f2f2',
  },
};

function PieceSvg({ squareWidth, isDragging, color, children }) {
  return (
    <svg
      viewBox="0 0 45 45"
      width={squareWidth}
      height={squareWidth}
      style={{
        display: 'block',
        filter: isDragging ? 'drop-shadow(0 4px 6px rgba(0,0,0,0.35))' : undefined,
      }}
    >
      {children(STYLE[color])}
    </svg>
  );
}

function renderPiece(color, draw) {
  return ({ squareWidth, isDragging }) => (
    <PieceSvg squareWidth={squareWidth} isDragging={isDragging} color={color}>
      {(s) => draw(s)}
    </PieceSvg>
  );
}

const stroke = {
  fill: 'none',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

function KnightGraphic({ s, isWhite }) {
  return (
    <>
      <path
        d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"
        fill={s.fill}
        stroke={s.stroke}
        strokeWidth={isWhite ? '1.25' : '1.1'}
        strokeLinejoin="round"
      />
      <path
        d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10"
        fill={s.fill}
        stroke={s.stroke}
        strokeWidth={isWhite ? '1.25' : '1.1'}
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="25.5" r="0.55" fill={s.detail} stroke={s.detail} />
      <ellipse
        cx="14.5"
        cy="15.5"
        rx="0.55"
        ry="1.5"
        transform="rotate(30 14.5 15.5)"
        fill={s.detail}
        stroke={s.detail}
      />
      {!isWhite && (
        <path
          d="M 24.55,10.4 L 24.1,11.85 L 24.6,12 C 27.75,13 30.25,14.49 32.5,18.75 C 34.75,23.01 35.75,29.06 35.25,39 L 35.2,39.5 L 37.45,39.5 L 37.5,39 C 38,28.94 36.62,22.15 34.25,17.66 C 31.88,13.17 28.46,11.02 25.06,10.5 L 24.55,10.4 Z"
          fill={s.detail}
          stroke="none"
        />
      )}
      <path
        d="M 18.5 12.5 C 20 10.5 22.5 9.5 25 10.5"
        fill="none"
        stroke={s.detail}
        strokeWidth="0.85"
        strokeLinecap="round"
      />
    </>
  );
}

function KingGraphic({ s }) {
  return (
    <>
      <path
        d="M 22.5 25.5 C 22.5 25.5 26.5 18.5 25.2 15.5 C 24.8 14 23.8 12.5 22.5 12.5 C 21.2 12.5 20.2 14 19.8 15.5 C 18.5 18.5 22.5 25.5 22.5 25.5 Z M 12.5 37 C 17.5 40 27.5 40 32.5 37 V 30.5 C 32.5 30.5 40.5 26 38 20 C 34.5 13.5 25.5 16.5 22.5 23.5 V 27 V 23.5 C 19.5 16.5 10.5 13.5 7 20 C 4.5 26 12.5 30.5 12.5 30.5 V 37 Z"
        fill={s.fill}
        stroke={s.stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M 22.5 11.5 V 6" {...stroke} stroke={s.stroke} strokeWidth="1.35" />
      <path d="M 20 8 H 25" {...stroke} stroke={s.stroke} strokeWidth="1.35" />
      <path d="M 13 30.5 C 18 27.5 27 27.5 32 30.5" {...stroke} stroke={s.detail} strokeWidth="0.95" />
      <path d="M 13 34 C 18 31.5 27 31.5 32 34" {...stroke} stroke={s.detail} strokeWidth="0.95" />
      <path d="M 13 37 C 18 35 27 35 32 37" {...stroke} stroke={s.detail} strokeWidth="0.95" />
    </>
  );
}

export const engravedPieces = {
  wP: renderPiece('white', (s) => (
    <>
      <path
        d="M 22.5 8.5 C 19.8 8.5 17.5 10.8 17.5 13.5 C 17.5 14.6 17.9 15.6 18.5 16.4 C 16.8 17.8 15.5 20 15.5 22.5 C 15.5 24.8 16.7 26.8 18.4 28 C 16 29.8 13.5 33.8 13.5 39.5 H 31.5 C 31.5 33.8 29 29.8 26.6 28 C 28.3 26.8 29.5 24.8 29.5 22.5 C 29.5 20 28.2 17.8 26.5 16.4 C 27.1 15.6 27.5 14.6 27.5 13.5 C 27.5 10.8 25.2 8.5 22.5 8.5 Z"
        fill={s.fill}
        stroke={s.stroke}
        strokeWidth="1.35"
      />
      <path d="M 14.5 35.5 H 30.5" {...stroke} stroke={s.detail} strokeWidth="1" />
    </>
  )),

  wR: renderPiece('white', (s) => (
    <>
      <path
        d="M 10 39 H 35 V 36 H 10 Z M 12.5 36 V 32 H 32.5 V 36 Z M 11.5 14 V 9.5 H 15 V 11.5 H 19.5 V 9.5 H 24.5 V 11.5 H 29 V 9.5 H 32.5 V 14 H 11.5 Z M 14 14 H 31 V 29 H 14 Z M 14 29 L 12.5 32 H 32.5 L 31 29 Z"
        fill={s.fill}
        stroke={s.stroke}
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path d="M 18.5 14 V 29 M 26.5 14 V 29" {...stroke} stroke={s.detail} strokeWidth="1" />
      <path d="M 14 24 H 31 M 14 20 H 31" {...stroke} stroke={s.detail} strokeWidth="0.85" opacity="0.7" />
    </>
  )),

  wN: renderPiece('white', (s) => <KnightGraphic s={s} isWhite />),

  wB: renderPiece('white', (s) => (
    <>
      <path
        d="M 9 36 C 12.5 35 19 36.5 22.5 34 C 26 36.5 32.5 35 36 36 C 37.2 37 38.5 38 39 38.5 C 38.2 39.2 37 39.2 35.5 38.8 C 32 37.8 26 39 22.5 37.5 C 19 39 13 37.8 9.5 38.8 C 8 39.2 6.8 39.2 6 38.5 C 6.5 38 7.8 37 9 36 Z M 15 32 C 17.2 34.2 27.8 34.2 30 32 C 30.4 30.8 30 30.2 30 30 C 30 27.5 27.5 26.2 27.5 26.2 C 32.5 24.8 33 15.5 22.5 11.5 C 12 15.5 12.5 24.8 17.5 26.2 C 17.5 26.2 15 27.5 15 30 C 15 30.2 14.6 30.8 15 32 Z M 25 8 A 2.4 2.4 0 1 1 20 8 A 2.4 2.4 0 1 1 25 8 Z"
        fill={s.fill}
        stroke={s.stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M 18 26 H 27 M 16 30 H 29 M 21.5 16 V 21" {...stroke} stroke={s.detail} strokeWidth="0.95" />
      <path d="M 24.5 12.5 L 26.5 16.5 L 20.5 16.5 Z" fill="none" stroke={s.detail} strokeWidth="0.95" />
    </>
  )),

  wQ: renderPiece('white', (s) => (
    <>
      <path
        d="M 9 26 C 17 24.5 28 24.5 36 26 L 38 14 L 31 24.5 L 30.5 11 L 25.5 24 L 22.5 10.5 L 19.5 24 L 14.5 11 L 14 24.5 L 7 14 Z M 9 26 C 9 28 10.5 28.2 11.5 30 C 12.3 31.2 12.2 31 11.8 33.2 C 10.5 34.2 11 35.5 11 35.5 C 9.8 37 11 38 11 38 C 17 39.2 28 39.2 34 38 C 34 38 35.2 37 34 35.5 C 34 35.5 34.5 34.2 33.2 33.2 C 32.8 31 32.7 31.2 33.5 30 C 34.5 28.2 36 28 36 26 C 28 24.5 17 24.5 9 26 Z"
        fill={s.fill}
        stroke={s.stroke}
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
      {[
        [7.5, 13],
        [14.5, 10.5],
        [22.5, 9.5],
        [30.5, 10.5],
        [37.5, 13],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.8" fill={s.fill} stroke={s.detail} strokeWidth="0.9" />
      ))}
      <path d="M 12 33 H 33 M 12.5 30 H 32.5" {...stroke} stroke={s.detail} strokeWidth="0.9" />
    </>
  )),

  wK: renderPiece('white', (s) => <KingGraphic s={s} />),

  bP: renderPiece('black', (s) => (
    <>
      <path
        d="M 22.5 8.5 C 19.8 8.5 17.5 10.8 17.5 13.5 C 17.5 14.6 17.9 15.6 18.5 16.4 C 16.8 17.8 15.5 20 15.5 22.5 C 15.5 24.8 16.7 26.8 18.4 28 C 16 29.8 13.5 33.8 13.5 39.5 H 31.5 C 31.5 33.8 29 29.8 26.6 28 C 28.3 26.8 29.5 24.8 29.5 22.5 C 29.5 20 28.2 17.8 26.5 16.4 C 27.1 15.6 27.5 14.6 27.5 13.5 C 27.5 10.8 25.2 8.5 22.5 8.5 Z"
        fill={s.fill}
        stroke={s.stroke}
        strokeWidth="1.15"
      />
      <path d="M 14.5 35.5 H 30.5" {...stroke} stroke={s.detail} strokeWidth="1" />
    </>
  )),

  bR: renderPiece('black', (s) => (
    <>
      <path
        d="M 10 39 H 35 V 36 H 10 Z M 12.5 36 V 32 H 32.5 V 36 Z M 11.5 14 V 9.5 H 15 V 11.5 H 19.5 V 9.5 H 24.5 V 11.5 H 29 V 9.5 H 32.5 V 14 H 11.5 Z M 14 14 H 31 V 29 H 14 Z M 14 29 L 12.5 32 H 32.5 L 31 29 Z"
        fill={s.fill}
        stroke={s.stroke}
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M 18.5 14 V 29 M 26.5 14 V 29" {...stroke} stroke={s.detail} strokeWidth="1" />
      <path d="M 14 24 H 31 M 14 20 H 31" {...stroke} stroke={s.detail} strokeWidth="0.85" opacity="0.85" />
    </>
  )),

  bN: renderPiece('black', (s) => <KnightGraphic s={s} isWhite={false} />),

  bB: renderPiece('black', (s) => (
    <>
      <path
        d="M 9 36 C 12.5 35 19 36.5 22.5 34 C 26 36.5 32.5 35 36 36 C 37.2 37 38.5 38 39 38.5 C 38.2 39.2 37 39.2 35.5 38.8 C 32 37.8 26 39 22.5 37.5 C 19 39 13 37.8 9.5 38.8 C 8 39.2 6.8 39.2 6 38.5 C 6.5 38 7.8 37 9 36 Z M 15 32 C 17.2 34.2 27.8 34.2 30 32 C 30.4 30.8 30 30.2 30 30 C 30 27.5 27.5 26.2 27.5 26.2 C 32.5 24.8 33 15.5 22.5 11.5 C 12 15.5 12.5 24.8 17.5 26.2 C 17.5 26.2 15 27.5 15 30 C 15 30.2 14.6 30.8 15 32 Z M 25 8 A 2.4 2.4 0 1 1 20 8 A 2.4 2.4 0 1 1 25 8 Z"
        fill={s.fill}
        stroke={s.stroke}
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
      <path d="M 18 26 H 27 M 16 30 H 29 M 21.5 16 V 21" {...stroke} stroke={s.detail} strokeWidth="0.95" />
      <path d="M 24.5 12.5 L 26.5 16.5 L 20.5 16.5 Z" fill="none" stroke={s.detail} strokeWidth="0.95" />
    </>
  )),

  bQ: renderPiece('black', (s) => (
    <>
      <path
        d="M 9 26 C 17 24.5 28 24.5 36 26 L 38 14 L 31 24.5 L 30.5 11 L 25.5 24 L 22.5 10.5 L 19.5 24 L 14.5 11 L 14 24.5 L 7 14 Z M 9 26 C 9 28 10.5 28.2 11.5 30 C 12.3 31.2 12.2 31 11.8 33.2 C 10.5 34.2 11 35.5 11 35.5 C 9.8 37 11 38 11 38 C 17 39.2 28 39.2 34 38 C 34 38 35.2 37 34 35.5 C 34 35.5 34.5 34.2 33.2 33.2 C 32.8 31 32.7 31.2 33.5 30 C 34.5 28.2 36 28 36 26 C 28 24.5 17 24.5 9 26 Z"
        fill={s.fill}
        stroke={s.stroke}
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
      {[
        [7.5, 13],
        [14.5, 10.5],
        [22.5, 9.5],
        [30.5, 10.5],
        [37.5, 13],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.8" fill={s.fill} stroke={s.detail} strokeWidth="0.9" />
      ))}
      <path d="M 12 33 H 33 M 12.5 30 H 32.5" {...stroke} stroke={s.detail} strokeWidth="0.9" />
    </>
  )),

  bK: renderPiece('black', (s) => <KingGraphic s={s} />),
};
