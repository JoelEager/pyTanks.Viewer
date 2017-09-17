# pyTanks
 \- A battleground for Python AIs to fight it out.
 
**See it live at [pytanks.csh.rit.edu](http://pytanks.csh.rit.edu).**

pyTanks is a project in three modules:
- [Server](https://github.com/JoelEager/pyTanks.Server) - A Python server that hosts a top-down, 
simplistic game of tanks. This takes care of maintaining the game state, handling commands from 
the players, and sending game state updates to both viewers and players.
- [Player](https://github.com/JoelEager/pyTanks.Player) - A Python AI that connects to the 
server and plays the game of tanks.
- **Viewer** - A JavaScript/HTML UI for humans to view the ongoing battle.

## Viewer
The current state of the viewer is "functional but ugly". The features are fairly complete but 
the HTML file in this repo is pretty bare bones.

#### Usage:
This repo is set up to be used as a local debugging tool for AI development. Just open 
`index.html` in your favorite browser. It will automatically try to connect to `localhost:9042` 
(which is the default server port). To have it connect to a different IP and/or port just modify 
the `viewer.connect()` call in `index.html`.

---
(For the other modules see the repos linked at the top of this readme.)