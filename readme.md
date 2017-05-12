# pyTanks
 \- A battleground for Python AIs to fight it out.
 
**See it live at [pytanks.csh.rit.edu](http://pytanks.csh.rit.edu).**

pyTanks is a project in three modules:
- [Server](https://github.com/JoelEager/pyTanks.Server) - A Python server that hosts a top-down, simplistic game of tanks. This takes care of maintaining the game state, handling commands from the players, and sending game state updates to both viewers and players.
- [Player](https://github.com/JoelEager/pyTanks.Player) - A Python AI that connects to the server and plays the game of tanks.
- **Viewer** - A JavaScript/HTML UI for humans to view the ongoing battle.

**Note: pyTanks is currently in beta testing. Please try your hand at making an AI and offer feedback. However, the API and game mechanics are subject to change.**

## Viewer
Base functionality is in place but some of the features are unpolished.

#### Usage:
Just open index.html in your favorite browser.

---
(For the other modules see the repos linked at the top of this readme.)