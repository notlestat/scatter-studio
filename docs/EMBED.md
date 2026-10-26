# Put a point field on a website

## Use the standalone HTML

1. In Scatter, click **Embed**.
2. Select **Standalone HTML**.
3. Download `scatter.html`.
4. Put the file beside your website's HTML file.
5. Add this markup where the point field belongs:

```html
<iframe
	src="./scatter.html"
	title="Interactive point field"
	style="width:100%;height:640px;border:0;display:block"
	loading="lazy"
	sandbox="allow-scripts"
></iframe>
```

Change `height` to fit your layout. The exported file contains the player and point data. It does not need the editor, the original pictures, or the depth model.

For React, use the same iframe in your component. Replace `style` with `style={{ width: '100%', height: 640, border: 0, display: 'block' }}`.

## Use the JavaScript player

1. In **Embed**, select **JavaScript player**.
2. Download `scatter.js` and `scatter-project.json`.
3. Put both files beside your website's HTML file.
4. Add a container and start the player:

```html
<div id="point-field" style="width:100%;height:640px"></div>
<script src="./scatter.js"></script>
<script>
	const field = Scatter.mount("#point-field", {
		project: "./scatter-project.json",
		autoCycle: true,
	});

	field.ready
		.then((player) => {
			// Optional: player.select(1), player.light(), player.reset().
		})
		.catch((error) => {
			console.error("Could not start Scatter:", error);
		});

	// Call field.destroy() when your page removes the container.
</script>
```

Serve the page over HTTP. Opening an HTML file directly can block the project JSON request. In React, call `mount` in an effect after the container exists. Return `field.destroy` from the effect's cleanup.

## Use an SVG without JavaScript

1. Click **Export SVG**.
2. Select the point detail and background.
3. Download the SVG.
4. Add it to your site:

```html
<img
	src="./scatter.svg"
	alt="An abstract point field"
	style="width:100%;height:auto"
/>
```

SVG records one frame and camera angle. It contains vector circles and paths, with no embedded image. You can edit the geometry in a vector editor. Lower detail produces smaller files. Full detail can contain up to 524,288 circles.

## Host configuration

The player needs WebGL 2. Focus its canvas to orbit with Arrow keys, zoom with + or −, or reset with 0. Space selects the next picture and S adds a light impulse. It respects reduced motion, pauses rendering while off screen, and keeps image data local. If your website enforces a Content Security Policy, allow the downloaded script and project from your own origin. The standalone HTML contains an inline script, so its own policy must permit that script. The JavaScript option works without an inline bootstrap if you put the `mount` call in your site's existing script.
