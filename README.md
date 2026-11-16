# naarrzz.github.io

My portfolio: a 3D "pose lab" where a jointed figure changes pose for each project, with glass panels for the case studies.

<p>
  <a href="https://naarrzz.github.io/"><img src="https://img.shields.io/badge/Open%20portfolio-111111?style=for-the-badge&logo=githubpages&logoColor=white" alt="Open the portfolio"></a>
</p>

I turn manual work into apps, automations and AI agents. I decide what gets built, test it on real devices, and ship it.

## What's inside

- **Pose lab:** a figure drawn the way [Flex and Count](https://github.com/naarrzz/pose-estimation-bicep-curl-counter) draws a body (bones and joints). It runs through bodybuilding poses, and each section puts it in its own 3D world: a server room, a gym, a posing stage, a warehouse. Drag to rotate.
- **Projects:** Flex and Count, Time Log, a coaching sales page and a supplement ops agent (Apps Script, BigQuery, Gemini agents, MCP), each with the problem, what I built, the tech, how I worked with AI, and the result.
- **3D phone:** screen recordings of each app play on a phone that floats next to the figure.
- **Quick view:** one plain page with everything, for when you only have a minute. It is also the fallback when WebGL isn't available.
- Light and dark, and it respects Reduce Motion.

## How it's built

Plain HTML, CSS and JavaScript with [three.js](https://threejs.org) (vendored in `vendor/`). No framework and no build step; GitHub Pages serves the repo as it is.

- `index.html` holds all the copy, so the page reads fine without JavaScript.
- `app.js` builds the rig, the poses, the camera and the HUD. The rep counter uses the same thresholds as Flex and Count: past 160° is down, under 50° is a rep.
- `style.css` is the glass look: blur, tint, a lit rim and a light that follows the pointer.
- `media/` has the screen recordings (demo data only).

Run it locally:

```
python3 -m http.server 5190
```

## Other projects on this account

These live in their own repos and keep their own links: [/time-log](https://naarrzz.github.io/time-log/), [/coaching](https://naarrzz.github.io/coaching/), [/pose-estimation-bicep-curl-counter](https://naarrzz.github.io/pose-estimation-bicep-curl-counter/).
