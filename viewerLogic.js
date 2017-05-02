// This file contains the logic for setting up the HMTL UI and running the viewer

// Client configuration - must match server's settings
var config = {
    framesPerSecond: 60,            // FPS to run the simulation at
    mapSize: {                      // Size of the map (must be the same as the canvas size)
        x: 500,
        y: 500
    },
    tankSpeed: 30,                  // Tank speed in pixels per second
    shellSpeed: 150,                // Shell speed in pixels per second
    
    maxPlayers: 15,                 // Maximum number of connected players
    
    serverIP: "localhost",          // Server's IP
    serverPort: "9042",             // Server's port
    apiPath: "/pyTanksAPI/viewer",  // API path on the server to connect to
    
    logFPS: false                    // Enable or disable client side FPS logging
};

// Colors used for rendering the canvas
var colors = {
    selectedTank: "cadetblue",
    deadTank: "orange",
    aliveTank: "black",
    shell: "red",
    wall: "gray"
}

// Globals
var gameState = null;
var gameStateUpdate = null;
var canvas = null;
var clientStatus = null;
var scoreboardRows = [];
var selectedTank = -1;
var framesDrawn = 0;
var lastTick = null;

// Setup and run the viewer
$(function() {
    canvas = $("#canvas")[0].getContext("2d");
    clientStatus = $("#clientStatus");
    
    // Setup the scoreboard
    var scoreboard = $("#scoreboard");
    for (var count = 0; count < config.maxPlayers; count++) {
        var aRow = $(
            "<tr id='score-" + count + "' " +
            "onmouseenter='selectedTank = " + count + ";' onmouseleave='selectedTank = -1;'>" + 
            "<td>&nbsp;</td></tr>");
        
        scoreboard.append(aRow);
        scoreboardRows.push(aRow);
    }
    
    // Connect to sever
    var socket = new WebSocket("ws://" + config.serverIP + ":" + config.serverPort + config.apiPath);
    
    // Finish setup on successful connect
    socket.onopen = function (event) {
        clientStatus.html("Connected");
        
        // Start the doTick animation loop
        var ticker = window.setInterval(function(){ doTick(performance.now()); }, 1000 / config.framesPerSecond);
        
        // Setup FPS logging if enabled
        var fpsTicker = null;
        if (config.logFPS) {
            fpsTicker = window.setInterval(function() {
                console.log("Current FPS: " + framesDrawn);
                framesDrawn = 0;
            }, 1000);
        }
    
        // Store any incoming gameState updates
        socket.onmessage = function (event) {
            gameStateUpdate = JSON.parse(event.data);
        };
        
        // Handle a disconnect
        socket.onclose = function (event) {
            window.clearInterval(ticker);
            if (config.logFPS) {
                window.clearInterval(fpsTicker);
            }
            clientStatus.html("Lost connection");
        };
    };

    // Handle errors in connecting
    socket.onerror = function (event) {
        clientStatus.html("Failed to connect");
    };
});

// Calculates and renders one frame
function doTick(frameTime) {
    // Calculate the frameDelta
    if (lastTick == null) { lastTick = frameTime; }
    var frameDelta = (frameTime - lastTick) / 1000;
    lastTick = frameTime;
    
    // Only run if gameState data is on hand
    if (gameState != null || gameStateUpdate != null) {
        if (gameStateUpdate == null) {
            extrapolateState(frameDelta);
        } else {
            applyUpdate();
        }
        
        renderFrame();
    }
    
    // Update the FPS counter if enabled
    if (config.logFPS) {
        framesDrawn += 1;
    }
}

// Apply the update from the server
function applyUpdate() {
    gameState = gameStateUpdate;
    gameStateUpdate = null;
    
    // Sort the tanks
    gameState.tanks.sort(function(tank1, tank2) {
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
    
    // Update the status
    if (gameState.ongoingGame) {
        clientStatus.html("Connected - Game in progress");
    } else {
        clientStatus.html("Connected - Waiting for players. (Feel free to connect a couple more to get a game started.)");
    }
    
    // Update any out of date scoreboard entries
    for (var count = 0; count < config.maxPlayers; count++) {
        var scoreHTML = "";
        
        if (count < gameState.tanks.length) {
            var tank = gameState.tanks[count];
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
        
        if (scoreboardRows[count].html() != scoreHTML) {
            scoreboardRows[count].html(scoreHTML);
        }
    }
}

// Extrapolates the current gameState
function extrapolateState(frameDelta) {
    var totalDistance = config.tankSpeed * frameDelta;
    for (tank of gameState.tanks) {
        if (tank.moving) {
            tank.x += Math.cos(tank.heading) * totalDistance;
            tank.y -= Math.sin(tank.heading) * totalDistance;
        }
    }
    
    totalDistance = config.shellSpeed * frameDelta;
    for (shell of gameState.shells) {
        shell.x += Math.cos(shell.heading) * totalDistance;
        shell.y -= Math.sin(shell.heading) * totalDistance;
    }
}

// Render a frame based on the current game state
function renderFrame() {
    canvas.clearRect(0, 0, config.mapSize.x, config.mapSize.y);
    
    if (gameState.ongoingGame) {
        for (var count = 0; count < gameState.tanks.length; count++) {
            var tank = gameState.tanks[count];
            
            if (!tank.alive) {
                if (count == selectedTank) {
                    canvas.fillStyle = colors.selectedTank;
                } else {
                    canvas.fillStyle = colors.deadTank;
                }
                
                drawRotatedRect(tank.x - 5, tank.y - 5, 10, 10, tank.heading);
            }
        }
        
        canvas.fillStyle = colors.shell;
        for (shell of gameState.shells) {
            drawRotatedRect(shell.x - 1, shell.y - 1, 3, 3, shell.heading);
        }
        
        for (var count = 0; count < gameState.tanks.length; count++) {
            var tank = gameState.tanks[count];
            
            if (tank.alive) {
                if (count == selectedTank) {
                    canvas.fillStyle = colors.selectedTank;
                } else {
                    canvas.fillStyle = colors.aliveTank;
                }
            
                drawRotatedRect(tank.x - 5, tank.y - 5, 10, 10, tank.heading);
            }
        }
        
        canvas.fillStyle = colors.wall;
        for (wall of gameState.walls) {
            canvas.fillRect(wall.x - wall.width / 2, wall.y - wall.height / 2, wall.width, wall.height);
        }
    }
}

// Draws a rotated rectangle with the current fill style
function drawRotatedRect(x, y, width, height, heading) {
    canvas.save();
    canvas.translate(x + width / 2, y + height / 2);
    canvas.rotate(heading);
    // Note: after transforming [0,0] is visually [x,y] so the rect needs to be offset accordingly when drawn
    canvas.fillRect(-width / 2, -height / 2, width, height);
    canvas.restore();
}