/*
 This file contains the logic for setting up the HMTL UI and running the viewer
    The host page has an element with id="viewer" to insert the UI into
    
    To connect to a server call viewer.connect("ip:port") after jQuery has loaded
    (This will also close any existing connection)
*/

// The viewer module
var viewer = {
    // Client viewer.configuration
    config: {
        framesPerSecond: 60,            // FPS to run the simulation at
        mapSize: {                      // Size of the map (also sets the canvas size)
            x: 500,
            y: 500
        },
        tankSpeed: 30,                  // Tank speed in pixels per second
        shellSpeed: 150,                // Shell speed in pixels per second
        
        maxPlayers: 15,                 // Maximum number of connected players
        apiPath: "/pyTanksAPI/viewer",  // API path on the server to connect to
        
        logFPS: false                    // Enable or disable client side FPS logging
    },

    // Colors used for rendering the canvas
    colors: {
        selectedTank: "cadetblue",
        deadTank: "orange",
        aliveTank: "black",
        shell: "red",
        wall: "gray"
    },
    
    // Default info text to show below the scoreboard
    infoText: "<center>A = alive, D = dead</center>Click on a tank's entry above to toggle highlighting it on the map and displaying info on its AI here.",
    
    // State variables
    gameState: null,
    gameStateUpdate: null,
    selectedTank: [-1, ""],
    framesDrawn: 0,
    lastTick: null,
    socket: null,
    ipAndPort: null,
    
    // jQuery objects
    canvas: null,
    clientStatus: null,
    scoreboardRows: [],
    tankInfo: null,

    // Connect to a new server
    connect: function (ipAndPort) {
        viewer.ipAndPort = ipAndPort;
        
        // Close any existing connection
        if (viewer.socket != null) {
            viewer.socket.close();
        }
        
        // Connect to the sever
        viewer.socket = new WebSocket("ws://" + ipAndPort + viewer.config.apiPath);
        
        // Finish setup on successful connect
        viewer.socket.onopen = function (event) {
            viewer.clientStatus.html("Connected");
            
            // Start the doTick animation loop
            var ticker = window.setInterval(function(){ viewer.doTick(performance.now()); }, 1000 / viewer.config.framesPerSecond);
            
            // Setup FPS logging if enabled
            var fpsTicker = null;
            if (viewer.config.logFPS) {
                fpsTicker = window.setInterval(function() {
                    console.log("Current FPS: " + viewer.framesDrawn);
                    viewer.framesDrawn = 0;
                }, 1000);
            }
        
            // Store any incoming viewer.gameState updates
            viewer.socket.onmessage = function (event) {
                viewer.gameStateUpdate = JSON.parse(event.data);
            };
            
            // Handle a disconnect
            viewer.socket.onclose = function (event) {
                window.clearInterval(ticker);
                if (viewer.config.logFPS) {
                    window.clearInterval(fpsTicker);
                }
                viewer.clientStatus.html("Lost connection - <button onclick='viewer.connect(viewer.ipAndPort);'>Reconnect</button>");
            };
        };

        // Handle errors in connecting
        viewer.socket.onerror = function (event) {
            viewer.clientStatus.html("Failed to connect - <button onclick='viewer.connect(viewer.ipAndPort);'>Retry</button>");
        };
    },

    // Calculates and renders one frame
    doTick: function (frameTime) {
        // Calculate the frameDelta
        if (viewer.lastTick == null) { viewer.lastTick = frameTime; }
        var frameDelta = (frameTime - viewer.lastTick) / 1000;
        viewer.lastTick = frameTime;
        
        // Only run if viewer.gameState data is on hand
        if (viewer.gameState != null || viewer.gameStateUpdate != null) {
            if (viewer.gameStateUpdate == null) {
                viewer.extrapolateState(frameDelta);
            } else {
                viewer.applyUpdate();
            }
            
            viewer.renderFrame();
        }
        
        // Update the FPS counter if enabled
        if (viewer.config.logFPS) {
            viewer.framesDrawn += 1;
        }
    },

    // Apply the update from the server
    applyUpdate: function () {
        viewer.gameState = viewer.gameStateUpdate;
        viewer.gameStateUpdate = null;
        
        // Sort the tanks
        viewer.gameState.tanks.sort(function (tank1, tank2) {
            // lower = first on the list
            
            var weight1 = -1 * tank1.kills;
            var weight2 = -1 * tank2.kills;
            
            if (tank1.alive) {
                weight1 -= 100;
            }
            if (tank2.alive) {
                weight2 -= 100;
            }
            
            return weight1 - weight2;
        });
        
        // Update selectedTank
        if (viewer.selectedTank[0] != -1) {
            var newSelectedTank = [-1, ""];
            
            for (var count = 0; count < viewer.gameState.tanks.length; count++) {
                if (viewer.selectedTank[1] == viewer.gameState.tanks[count].name) {
                    newSelectedTank[0] = count;
                    newSelectedTank[1] = viewer.selectedTank[1];
                    break;
                }
            }
            
            if (newSelectedTank[0] == -1 || newSelectedTank[0] != viewer.selectedTank[0]) {
                viewer.scoreboardRows[viewer.selectedTank[0]].css("color", "");
                viewer.selectedTank = newSelectedTank;
                
                if (viewer.selectedTank[0] != -1) {
                    viewer.scoreboardRows[viewer.selectedTank[0]].css("color", viewer.colors.selectedTank);
                }
            }
        }
        
        // Update the status
        var status = "";
        if (viewer.gameState.ongoingGame) {
            status = "Connected - Game in progress";
        } else {
            status = "Connected - Waiting for players. (Feel free to connect a couple more to get a game started.)";
        }
        
        if (status != viewer.clientStatus.html()) {
            viewer.clientStatus.html(status);
        }
        
        // Show the info
        var info = viewer.infoText;
        if (viewer.selectedTank[0] != -1) {
            info = "<b><center>Info on this AI:</center></b>" + viewer.gameState.tanks[viewer.selectedTank[0]].info;
        }
        
        if (info != viewer.tankInfo.html()) {
            viewer.tankInfo.html(info);
        }
        
        // Update any out of date scoreboard entries
        for (var count = 0; count < viewer.config.maxPlayers; count++) {
            var scoreHTML = "";
            
            if (count < viewer.gameState.tanks.length) {
                var tank = viewer.gameState.tanks[count];
                scoreHTML += "<td>";
                
                if (tank.alive) {
                    scoreHTML += "A";
                } else {
                    scoreHTML += "D";
                }
                
                scoreHTML += "</td><td>" + tank.name + "</td><td>" + tank.kills + "</td><td>" + tank.wins + "</td>";
            } else {
                scoreHTML = "<td>&nbsp;</td>";
            }
            
            if (viewer.scoreboardRows[count].html() != scoreHTML) {
                viewer.scoreboardRows[count].html(scoreHTML);
            }
        }
    },

    // Extrapolates the current viewer.gameState
    extrapolateState: function (frameDelta) {
        var totalDistance = viewer.config.tankSpeed * frameDelta;
        for (tank of viewer.gameState.tanks) {
            if (tank.moving) {
                tank.x += Math.cos(tank.heading) * totalDistance;
                tank.y -= Math.sin(tank.heading) * totalDistance;
            }
        }
        
        totalDistance = viewer.config.shellSpeed * frameDelta;
        for (shell of viewer.gameState.shells) {
            shell.x += Math.cos(shell.heading) * totalDistance;
            shell.y -= Math.sin(shell.heading) * totalDistance;
        }
    },

    // Render a frame based on the current game state
    renderFrame: function () {
        viewer.canvas.clearRect(0, 0, viewer.config.mapSize.x, viewer.config.mapSize.y);
        
        if (viewer.gameState.ongoingGame) {
            for (var count = 0; count < viewer.gameState.tanks.length; count++) {
                var tank = viewer.gameState.tanks[count];
                
                if (!tank.alive) {
                    if (count == viewer.selectedTank[0]) {
                        viewer.canvas.fillStyle = viewer.colors.selectedTank;
                    } else {
                        viewer.canvas.fillStyle = viewer.colors.deadTank;
                    }
                    
                    viewer.drawRotatedRect(tank.x, tank.y, 10, 10, tank.heading);
                }
            }
            
            viewer.canvas.fillStyle = viewer.colors.shell;
            for (shell of viewer.gameState.shells) {
                viewer.drawRotatedRect(shell.x, shell.y, 3, 3, shell.heading);
            }
            
            for (var count = 0; count < viewer.gameState.tanks.length; count++) {
                var tank = viewer.gameState.tanks[count];
                
                if (tank.alive) {
                    if (count == viewer.selectedTank[0]) {
                        viewer.canvas.fillStyle = viewer.colors.selectedTank;
                    } else {
                        viewer.canvas.fillStyle = viewer.colors.aliveTank;
                    }
                
                    viewer.drawRotatedRect(tank.x, tank.y, 10, 10, tank.heading);
                }
            }
            
            viewer.canvas.fillStyle = viewer.colors.wall;
            for (wall of viewer.gameState.walls) {
                viewer.canvas.fillRect(wall.x - wall.width / 2, wall.y - wall.height / 2, wall.width, wall.height);
            }
        }
    },

    // Draws a rotated rectangle with the current fill style
    //  x, y must be the center of the rectangle
    drawRotatedRect: function (x, y, width, height, heading) {
        viewer.canvas.save();
        viewer.canvas.translate(x, y);
        viewer.canvas.rotate(-heading);    // rotate() is clockwise, pyTanks headings are counter-clockwise
        // Note: after transforming [0,0] is visually [x,y] so the rect needs to be offset accordingly when drawn
        viewer.canvas.fillRect(-width / 2, -height / 2, width, height);
        viewer.canvas.restore();
    },
    
    // onclick handler for the scoreboard rows
    selectTank: function (id) {
        var oldId = viewer.selectedTank[0];
        
        // Unmark the old tank
        if (viewer.selectedTank[0] != -1) {
            viewer.scoreboardRows[viewer.selectedTank[0]].css("color", "");
            viewer.selectedTank = [-1, ""];
        }
        
        // Mark the new one
        if (oldId != id && name < viewer.gameState.tanks.length) {
            viewer.scoreboardRows[id].css("color", viewer.colors.selectedTank);
            viewer.selectedTank = [id, viewer.gameState.tanks[id].name];
        }
    }
};

// Set up the viewer
$(function() {
    var htmlUI = `
    <style>
        td {
            padding: 3px;
        }
    </style>
    <div style="text-align: center;">
    <p id="clientStatus">Connecting...</p>
    <canvas id="canvas" width="` + viewer.config.mapSize.x + `" height="` + viewer.config.mapSize.y + `" style="display: inline-block; border: 1px solid #d3d3d3; vertical-align: top; margin-bottom: 10px;"></canvas>
    <div style="display: inline-block; border: 1px solid #d3d3d3; width: 400px; text-align: left;">
        <table id="scoreboard">
            <tr><td></td><td>Tank</td><td>Kills this round</td><td>Rounds won</td></tr>
        </table>
        <div id="tankInfo" style="margin: 5px;">
            ` + viewer.infoText + `
        </div>
    </div>
    </div>`;

    $("#viewer").html(htmlUI);
    
    // Fill jQuery variables
    viewer.canvas = $("#canvas")[0].getContext("2d");
    viewer.clientStatus = $("#clientStatus");
    viewer.tankInfo = $("#tankInfo");

    // Set up the scoreboard
    var scoreboard = $("#scoreboard");
    for (var count = 0; count < viewer.config.maxPlayers; count++) {
        var aRow = $(
            "<tr id='score-" + count + "' " +
            "onclick='viewer.selectTank(" + count + ");'>" + 
            "<td>&nbsp;</td></tr>");
        
        scoreboard.append(aRow);
        viewer.scoreboardRows.push(aRow);
    }
});