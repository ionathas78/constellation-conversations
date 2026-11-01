# Dice notation

Expressions use decimal integers, `NdS`, `+`, `-`, `*`, `/`, unary signs, and parentheses. Multiplication/division precede addition/subtraction. Dice rolls remain visible per term; dropped dice are identified, reroll history uses arrows, and explosion components are included. Division can produce fractions.

| Expression | Meaning |
| --- | --- |
| `d20`, `1d100`, `3d6+2` | Standard dice and modifiers |
| `2d6 + 1d8 * 2` | Multiple terms and arithmetic |
| `4d6kh3`, `4d6kl2` | Keep highest three / lowest two |
| `4d6dh1`, `4d6dl1` | Drop highest one / lowest one |
| `adv`, `dis` | `2d20kh1`, `2d20kl1` |
| `1d6!` | Explode on maximum; chain maximums |
| `4d6r<2` | Reroll matching results repeatedly |
| `4d6ro=1` | Reroll a matching result once |
| `5d10cs>=7` | Count kept dice whose values meet the target |
| `2d6!kh1cs>=8` | Explode, keep highest compound die, count success |

Modifiers are written after the dice term. Execution order is reroll → explode → keep/drop → success count regardless of modifier order. Rerolls also apply to explosion draws. Exploded components count as one compound die for keep/drop and success counting. Ties are resolved by original die order. Keep/drop zero is permitted. Success counting is per dice term; arithmetic is applied to the resulting term values. One modifier per family per term is allowed; keep/drop share a family, as do `r`/`ro`.

Comparisons for rerolls and successes: `<`, `<=`, `=`, `>=`, `>`. This is one explicit extensible grammar, not a claim to reproduce every virtual tabletop's notation. Extend `parseDice` AST nodes and `rollDice` evaluators together, then add deterministic tests.

Limits: 300 input characters, 100 total declared dice, 2–1,000,000 sides, 16 nesting levels, 100 rerolls per component, 100 explosions per die, 2,000 total random draws, constants ≤ 1 billion, arithmetic results ≤ 1 trillion in magnitude. Invalid or excessive operations produce errors instead of partial rolls. No `eval`, dynamic functions, or unbounded recursion.

Randomness uses `crypto.getRandomValues` with rejection sampling to avoid modulo bias. Tests inject deterministic die values, never replace browser randomness in production. Rerolling or returning to an earlier branch is intentionally allowed in this reading experience.
