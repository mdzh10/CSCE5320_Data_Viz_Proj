# Usability test protocol

Purpose: find out whether someone who did not build the dashboard can answer each question from it, and whether they come away with the right idea about what the lines mean. This is the downstream validation step of the nested model. **It has not been run yet**; fill in the results table after the sessions.

## Setup

- 2 or 3 participants who have not seen the dashboard (classmates outside the group are fine). 10 to 15 minutes each.
- Open `dashboard.html` in a desktop browser at its default state. Do not explain the charts. Ask them to think aloud.
- One person facilitates and one notes; time each task with a phone stopwatch and write down where the participant hesitates or points at the wrong thing.

## Tasks

Success means the participant reaches the answer without help. Give a hint after 90 seconds and mark the task "with hint".

| # | Task (read aloud) | Success looks like |
|---|---|---|
| 1a | "Does physical independence go up or down over the years after injury?" | Reads the line chart: about 76 at year 1, low 80s by year 10, then roughly 80 to 85; names the unit (0 to 100). |
| 1b | "Are the same people followed from year 1 to year 45?" | Says no, or points to the notice above the chart. This is the question the professor raised. |
| 1c | "Show me only people who have a score at every year from 20 to 40. How many are there?" | Switches to the same-people view, sets the range 20 to 40, reads 51. |
| 1d | "How much does a person's independence change over five years?" | Opens the change view and says the average change is small and many people stay the same. |
| 2a | "Find interviews where someone is fully independent but unhappy." | Points to the red marks and can say what makes them red. |
| 2b | "Use the commonly used cutoffs for life satisfaction instead." | Finds the standard SWLS preset. |
| 3a | "Do people with paraplegia and tetraplegia differ in independence?" | Reads the stacked bars or the mean beside them: about 93 against 73 on average, with far more people at the ceiling of 100 among paraplegia. |
| 3b | "Is that difference definitely caused by the severity of injury?" | Says no or hesitates; the caveat under the chart mentions that groups overlap with era and level. |
| 4a | "Why are there so few scores in the first years?" | Finds the heat map and mentions that the instrument was not used before late 1995 or that young children are not asked. |
| 4b | "What happens to people who leave the study: do they look different beforehand?" | Opens the attrition panel and reports that people who later died scored lower earlier. |
| 5 | "Among people at the same independence level, are those who screen positive for depression less satisfied?" | Reads the right-hand panel and says yes, at every level, with the size of the gap. |
| 6 | "By their late twenties, how many people injured as children are working, and does it differ between paraplegia and tetraplegia?" | Splits by injury level, reads the working panel at 26 to 30, and notes the overlapping bands. |
| 7 | "Narrow to adolescents with tetraplegia and send me exactly this view." | Uses the filter chips and **Copy link to this view**. |

## After each session

Ask: what was the main message of the page? What was confusing? Was anything misleading? Record answers verbatim.

## Results

| Participant | Tasks failed | Tasks with hint | Slowest task | Quote about the trajectory lines | Change made |
|---|---|---|---|---|---|
| P1 | | | | | |
| P2 | | | | | |
| P3 | | | | | |

Fixes that follow from the sessions go into `_team_notes` (not into this file) and into the report's evaluation section.
