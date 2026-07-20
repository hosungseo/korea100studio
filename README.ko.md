# korea100studio

[![npm version](https://img.shields.io/npm/v/korea100studio.svg)](https://www.npmjs.com/package/korea100studio)
[![CI](https://github.com/hosungseo/korea100studio/actions/workflows/ci.yml/badge.svg)](https://github.com/hosungseo/korea100studio/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/korea100studio.svg)](LICENSE)

[English](README.md) · 📖 **한국어**

어떤 프로세스든 — 행위자 × 단계 × 업무 — **세로형 swimlane 보드**(SVG, 선택
PNG)로 그리고, **구성 품질을 감사**하고, **단계 순차 점등 애니메이션**으로
내보냅니다. korea100studio는 [korea100](https://hosungseo.github.io/korea100)의
업무구조도 렌더러를 도메인 무관하게 추출·일반화한 독립 Agent Skill이에요.
`SKILL.md` 진입점 + 네이티브 의존성 0인 작은 ESM CLI(`scripts/board.mjs`)로
**Claude Code**와 **Codex** 안에서 그대로 동작합니다.

## 예시

같은 엔진, 두 프로필 — 중립 소프트웨어 릴리스 보드(`default`)와 korea100식
정부 보드(`gov`):

| `default` 프로필 | `gov` 프로필 |
|---|---|
| ![default 예시](assets/example-default.png) | ![gov 예시](assets/example-gov.png) |

보드는 단계 순차 점등 애니메이션(자체 완결형 SMIL SVG)으로도 내보낼 수 있어요 —
[`assets/example-motion.svg`](assets/example-motion.svg) 참고,
`node scripts/board.mjs motion fixtures/generic-sample.json`으로 생성.

## 설치

**Agent Skill로** (Claude Code / Codex) — 에이전트가 `SKILL.md`를 인식하도록
스킬 디렉토리에 클론하세요:

```bash
# Claude Code
git clone https://github.com/hosungseo/korea100studio.git ~/.claude/skills/korea100studio
# Codex
git clone https://github.com/hosungseo/korea100studio.git ~/.agents/skills/korea100studio

cd ~/.claude/skills/korea100studio   # 클론한 위치로
npm install && npm test
```

**CLI로** (어느 프로젝트든) — npm으로:

```bash
npm install -g korea100studio
korea100studio render board.json --out board.svg

# 설치 없이:
npx korea100studio render board.json --out board.svg
```

## 빠른 시작

```bash
# 보드를 SVG로 렌더 (rsvg-convert/cairosvg 있으면 PNG도)
node scripts/board.mjs render fixtures/generic-sample.json --out board.svg --png

# 구성 품질 감사 (교차·노드관통·꺾임·우회율)
node scripts/board.mjs audit fixtures/generic-sample.json

# 품질 예산 게이트 (--strict면 초과 시 exit 1)
node scripts/board.mjs validate fixtures/generic-sample.json --strict

# 단계 순차 점등 애니메이션 (자체 완결형 SVG)
node scripts/board.mjs motion fixtures/generic-sample.json --out board.motion.svg
```

## CLI

| 명령 | 용도 |
|---|---|
| `render <board.json> [--out f.svg] [--png] [--profile p]` | 보드를 SVG로 렌더; rasterizer 있으면 PNG |
| `audit <board.json> [--json] [--profile p]` | 구성 점수·지표 출력 (`--json`은 기계 판독용) |
| `validate <board.json> [--strict] [--profile p]` | 스키마 + 구성 게이트 (strict 위반 시 exit 1) |
| `motion <board.json> [--out f.svg] [--profile p]` | 단계 점등 애니메이션 SVG |
| `check <file.svg>` | SVG 구조 무결성 점검 |

`--version` / `--help`도 지원해요.

## 입력

보드는 [`schemas/board-v1.schema.json`](schemas/board-v1.schema.json)을
따릅니다: `lanes`(행위자) × `stages`(단계) × `nodes`(`{id, lane, stage, label,
emphasis, refs}`) × `edges`(`{id, source, target, type}`). 자연어 프로세스를
보드로 바꾸는 방법은 [`references/authoring.md`](references/authoring.md),
시작용 골격은 [`templates/board.template.json`](templates/board.template.json)
참고. 스키마가 못 잡는 참조 오류(존재하지 않는 lane/stage, 끊긴 엣지, 중복 id)는
어느 노드가 뭘 잘못 참조했는지 친절한 메시지로 알려줘요.

## 프로필

- **`default`** — 중립·영어 라벨; 모든 도메인용.
- **`gov`** — korea100 한국 정부 룩 (선행/핵심/병목/회귀 배지).

`--profile` 플래그나 보드의 `"profile"` 필드로 선택. See
[`references/profiles.md`](references/profiles.md).

## 출력 & 의존성

순수 Node.js(≥20), 스키마 검증용 의존성 `ajv` 1개. **SVG는 항상 생성**되고,
PNG는 `rsvg-convert`(librsvg)나 `cairosvg`가 `PATH`에 있을 때만 나와요. 모션
출력은 자체 완결형 애니메이션 SVG(SMIL, JS·외부 자산 0).

## 구성 품질

`audit`/`validate` 명령이 보드의 배선 지오메트리를 점수화해요. 핵심 지표는
**노드관통** — 연결선이 무관한 카드 뒤로 라우팅돼 z-order에 가려지는 것.
렌더러의 거터 라우팅이 행 내부·회귀 엣지를 카드 뒤로 숨지 않게 유지합니다. See
[`references/composition-quality.md`](references/composition-quality.md).

## 라이선스

MIT © 2026 Hosung Seo
