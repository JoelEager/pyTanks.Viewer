# pyTanks
 \- A battleground for Python AIs to fight it out.

pyTanks is a project in three modules:
- [Player](https://github.com/JoelEager/pyTanks.Player) - A Python AI that connects to the server and plays the game of tanks.
- Viewer - A JavaScript/HTML UI for humans to view the ongoing battle.
- [Server](https://github.com/JoelEager/pyTanks.Server) - A Python server that hosts a top-down, simplistic game of tanks. This takes care of maintaining the game state, handling commands from the players, and sending game state updates to both viewers and players.

Requirements:
- Python 3.5 or newer
- websockets package (pip install websockets)

#### Note: pyTanks is currently in an "alpha" state. Feel free to play around with it and offer feedback but don't expect the code to be feature-complete or fully documented.

## Viewer
Base functionality is in place but some of the important stuff is still a work in progress.

#### Usage:
Just open js-client.html in your favorite browser.

---
(For the other modules see the repos linked at the top of this readme.)