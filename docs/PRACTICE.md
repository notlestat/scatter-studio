# Make three visible changes in Scatter

These exercises use your existing project. They change the starting appearance, then return it to the saved version. Treat them as learner tasks; they have not been completed on your behalf.

## Start the editor

From the project folder, run:

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. You should see the four procedural studies and a large point field.

Before editing, run `git status --short`. Keep track of your own changes. Avoid discarding any work you want to keep.

## Change the initial movement

1. Open `src/model.ts`.
2. Find `drift: 36` inside `defaults()`.
3. Change that value to `10` and save.
4. Reload the editor.
5. Confirm that the Drift control reads 10.
6. Move the Drift slider toward 100 and compare the released side of the field.

You should see less release at the lower value and more at the higher value. Keep the same picture and line position while comparing.

Before moving on, explain why `model.ts` changes the starting value while `engine.ts` determines what that value does to particles.

## Change an interface colour

1. Open `src/style.css`.
2. Find `--shell: #e7e8e2` in `:root`.
3. Change it to `#dfe5ee` and save.
4. Inspect the toolbar on a narrow viewport.

The sticky mobile toolbar uses `var(--shell)`, so its background changes. The desktop page background also has a separate literal declaration in `:root`; it does not automatically follow this variable. Finding that distinction is part of the exercise.

Explain why editing a CSS variable does not change a literal value elsewhere. Then decide which declaration you would change if you wanted both surfaces to follow one shared colour.

## Compare a snapshot with an interactive player

1. Pause the artwork.
2. Export an SVG at a moderate detail setting.
3. Open the SVG in a browser or vector editor.
4. Return to Scatter and download a standalone HTML embed with autoplay enabled.
5. Open that HTML in a browser with WebGL 2 support.

The SVG stays at one frame. The HTML can animate and respond to camera input. Both come from the same player geometry, but they contain different things: the SVG contains shapes; the HTML contains point data and the code that moves it.

Explain which output you would use for a printed poster and which you would use for an interactive website element.

## Record what you changed

Write down the files you edited, the visible outcome and one explanation of the control-to-renderer path. A screenshot plus your own explanation is useful evidence; a checked box alone is not.

If these were temporary experiments, manually return the two edited values to their original values after checking that you have no other edits to preserve. Use `git diff` to inspect the result.

No learning progress or completion status is recorded automatically by this exercise.
