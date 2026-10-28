export function BotanicalPlate() {
  return (
    <svg
      viewBox="0 -20 480 530"
      role="img"
      aria-label="Original botanical study of a leafy plant in a terracotta pot"
    >
      <defs>
        <linearGradient id="leaf" x2="1" y2="1">
          <stop stopColor="#718c58" />
          <stop offset="1" stopColor="#284e3a" />
        </linearGradient>
      </defs>
      <circle cx="246" cy="231" r="172" fill="#e6e9d7" />
      <circle
        cx="246"
        cy="231"
        r="151"
        fill="none"
        stroke="#b9c6a8"
        strokeDasharray="2 8"
      />
      <ellipse cx="242" cy="458" rx="95" ry="12" fill="#283c2b" opacity=".09" />
      <path
        d="M239 362 Q225 263 252 108 M238 321 L171 251 M241 275 L315 209 M244 224 L199 160 M247 178 L297 127"
        fill="none"
        stroke="#486345"
        strokeWidth="6"
        strokeLinecap="round"
      />
      {[
        [171, 251, -52],
        [315, 209, 45],
        [199, 160, -41],
        [297, 127, 35],
        [252, 108, 0],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <path
            d="M0 8 C-67-18-58-92 0-113 C53-81 56-22 0 8Z"
            fill="url(#leaf)"
            stroke="#486345"
            strokeWidth="1.5"
          />
          <path
            d="M0 6 Q-7-47 0-100 M-3-30 L-32-57 M-4-49 L27-75 M-3-66 L-24-84"
            fill="none"
            stroke="#b9c69a"
            strokeWidth="1.6"
          />
          <path
            d="M-12-79 Q-38-54-26-30"
            fill="none"
            stroke="#c7d1a6"
            strokeWidth="7"
            opacity=".15"
          />
        </g>
      ))}
      <path d="M181 363 L195 444 Q240 464 286 444 L301 363Z" fill="#b77659" />
      <path d="M195 380 L205 438 Q216 444 224 444 L216 380" fill="#cc9171" />
      <path
        d="M181 363 Q241 347 301 363 L301 379 Q239 394 181 379Z"
        fill="#cc9474"
      />
      <ellipse cx="241" cy="362" rx="59" ry="10" fill="#765a40" />
      <path d="M240 363 L239 341" stroke="#486345" strokeWidth="6" />
      <text x="38" y="486" fill="#6a7c70" fontFamily="Georgia" fontSize="12">
        Fig. 01 — A study in green
      </text>
    </svg>
  );
}
