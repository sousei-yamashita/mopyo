export function creatureSvg(result, className = "creature") {
  const { species, phenotype, artifact } = result;
  const body = species.body === "tall"
    ? '<path d="M91 64C121 43 171 54 174 99l-2 65c-2 34-27 53-69 45-37-7-52-34-41-65l12-54c3-12 8-20 17-26Z"/>'
    : species.body === "wide"
      ? '<path d="M38 126c0-43 36-70 91-68 58 1 90 30 82 78-7 42-47 73-99 72-47-1-74-32-74-82Z"/>'
      : '<path d="M57 117c3-43 36-66 78-61 44 5 70 38 62 83-8 44-40 69-84 63-42-5-60-39-56-85Z"/>';
  const ears = species.ears === "leaf"
    ? '<path d="M91 69C67 49 69 29 79 19c20 10 30 28 23 48M151 65c7-25 25-34 39-31 1 20-11 37-32 44"/>'
    : species.ears === "drop"
      ? '<path d="M91 67C74 33 48 31 40 45c4 27 21 42 47 43M158 69c19-32 43-28 49-12-8 26-25 37-49 32"/>'
      : '<path d="M111 60c-7-27 3-43 17-49 14 15 13 32-3 51M137 62c7-21 22-28 34-23-1 19-12 30-31 34"/>';
  const eye = phenotype.eyes === "open"
    ? '<circle cx="105" cy="112" r="6"/><circle cx="156" cy="113" r="6"/>'
    : '<path d="M98 113q8 6 16 0M148 114q8 6 16 0" class="line"/>';
  const mark = Array.from({ length: phenotype.markings }, (_, i) => `<circle cx="${118 + i * 13}" cy="78" r="3" class="mark"/>`).join("");
  const artifactShape = artifact.includes("鍵") ? '<path d="M124 162a8 8 0 1 0-8-8l-11 11 5 5 4-4 4 4 5-5"/>' : artifact.includes("鈴") ? '<path d="M116 166h22l-4-6v-9c0-12-14-12-14 0v9Zm8 3h6"/>' : '<path d="M116 157c0-9 16-13 21-3 5 11-7 19-18 15-6-2-7-8-3-12Zm7 3c2 3 7 2 7-2"/>';
  return `<svg class="${className}" style="--creature-hue:${species.hue}" viewBox="0 0 250 240" role="img" aria-label="${result.id} の姿">
    <g class="ears">${ears}</g><g class="body">${body}</g>${mark}
    <g class="face">${eye}<path d="M127 128q6 5 12 0" class="line"/></g>
    <g class="feet"><path d="M83 194q-4 17 15 17M167 195q5 16-14 16"/></g>
    <g class="artifact">${artifactShape}</g>
  </svg>`;
}
