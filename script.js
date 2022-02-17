let grid = {};
let cache = {};
let game = {};

const debug = false; //set to true to reveal the game board at game start - originally used for debugging the game logic

//INITIALISE
function startupGame() {
  cacheUI();
  initialiseGameState();
  initialiseSetup();
}

function cacheUI() {
  cache = {
    //Setup window cache UI elements
    setupWindow: document.getElementById('gameSetup'),
    rowNum: document.getElementById('rowNum'),
    rowSel: document.getElementById('rowSelector'),
    colNum: document.getElementById('colNum'),
    colSel: document.getElementById('colSelector'),
    mineNum: document.getElementById('mineNum'),
    mineSel: document.getElementById('mineSelector'),

    //Main game window cache (it's built dynamically so nothing else to cache)
    mainWindow: document.querySelector('main'),
    gameWindow: document.getElementById('gameWindow'),
  }
  console.log('Loading cache complete');
}

function initialiseGameState() {
  grid = {
    rows: null,
    cols: null,
    mines: null,
    matrix: [],
    isRevealed: [],
    rearrangeCounter: 0,
  }
  game = {
    end: false,
    win: false,
    losingIndex: [],
    safeSquaresRevealed: 0,
  }
  console.log('Initialising gamestate complete');
}

function initialiseSetup() {
  //initialise the setup window to the appropriate values
  cache.rowNum.innerText = cache.rowSel.value;
  cache.colNum.innerText = cache.colSel.value;
  cache.mineNum.innerText = cache.mineSel.value;

  //row slider
  cache.rowSel.addEventListener('change', (event) => {
    cache.rowNum.innerText = event.target.value;
    checkMineSliderMax();
  });
  //col slider
  cache.colSel.addEventListener('change', (event) => {
    cache.colNum.innerText = event.target.value;
    checkMineSliderMax();
  });
  //mine slider
  cache.mineSel.addEventListener('change', (event) => {
    cache.mineNum.innerText = event.target.value;
  });

  checkMineSliderMax(); //set mine slider to match default values

  console.log('Displaying setup window');
  //do UI stuff when resetting

}

function initialiseGame() {
  // console.log('lets go!');
  // this.gameWindow = document.getElementById('gameWindow');

  //Get player settings input
  grid.rows = cache.rowSel.value;
  grid.cols = cache.colSel.value;
  grid.mines = cache.mineSel.value;
  grid.area = grid.rows * grid.cols;



  console.log("Creating game board");
  setupGrid(); // create the game grid based on the user's inputs during the setup

  
  console.log("Placing mines...");
  setupGameMatrices(); //set up grid matrix to operate the gamestate

  console.log('Game setup complete');

  cache.setupWindow.style.display = 'none';
  cache.mainWindow.style.display = 'block';


  console.log("Displaying game board")
  render(); //first render of gameboard!



  //Setup over

}

function checkMineSliderMax() {
  //Changes the maximum value allowable on the mine selector slider so that you can't have too many mines in the grid
  cache.mineSel.max = cache.rowSel.value * cache.colSel.value - 1;
  cache.mineSel.value = Math.min(cache.mineSel.value,cache.mineSel.max);
  cache.mineNum.innerText = cache.mineSel.value;
}

//SETUP
function setupGrid() {
  //Dynamically create a CSS grid
  let gridRows = Number(grid.rows);
  let gridCols = Number(grid.cols);

  cache.gameWindow.style.gridTemplateColumns = `repeat(${gridCols}, ${100/gridCols}%)`;
  cache.gameWindow.style.gridTemplateRows = `repeat(${gridRows}, ${100/gridRows}%)`;

  //Create the grid-are-template string to link id's with elements with grid locations
  let gridAreaStr = [];
  for (let i=0; i<gridRows; i++) {
    let gridRowStr = '';

    for (let j=0; j<gridCols; j++) {
      let newID = `${i}-${j}`; //generate an id for the new element based on it's position in the grid
      generateNewGridElement(newID);
      gridRowStr += `${newID} `;
    }
    gridAreaStr += `"${gridRowStr}"\n`;
  }
  cache.gameWindow.style.gridTemplateAreas = gridAreaStr;
}

function generateNewGridElement(elementID) {
  let newEl = document.createElement('div');
  // newEl.innerText = elementID;
  newEl.id = elementID;
  newEl.style.gridArea = elementID;
  newEl.classList.add('minesweeperGrid');

  cache.gameWindow.appendChild(newEl);
}

function matrix(m, n, filling) {
  return Array.from({
    length: m
  }, () => new Array(n).fill(filling));
}

function setupGameMatrices() {
  let gridRows = Number(grid.rows);
  let gridCols = Number(grid.cols);
  let gameGrid = matrix(gridRows, gridCols, 0);

  gameGrid = placeMinesInGrid(gameGrid); //set up mines at random
  
  grid.matrix = gameGrid;
  grid.isRevealed = matrix(gridRows, gridCols, debug); //matrix to establish which square have been revealed
}

function placeMinesInGrid(gameGrid) {
  let mineCount = 0;
  while (mineCount<grid.mines) {
    mineRow = Math.floor(Math.random() * grid.rows);
    mineCol = Math.floor(Math.random() * grid.cols);

    if (gameGrid[mineRow][mineCol] != 'X') {
      //if not trying to overwrite an existing mine, make a new one!
      gameGrid[mineRow][mineCol] = 'X'; //place mine in grid

      //now update adjacent grids to let them know there is a mine present!
      let adjGridEls = findAdjacentGrids(mineRow, mineCol);
      let adjGrid = adjGridEls.filter(x=>(
        (x[0]>=0) && (x[0] < grid.rows) && (x[1]>=0) && (x[1] < grid.cols)
      ));
      //iterate through grid elements adjacent to mine and add 1 to their value
      for (adjGridIdx of adjGrid) {
        if (adjGridIdx.length > 1) {
          let adjGridEl = gameGrid[adjGridIdx[0]][adjGridIdx[1]];
          if (adjGridEl != 'X'){
            gameGrid[adjGridIdx[0]][adjGridIdx[1]] += 1;
          }
        }
      }
      mineCount++
    }
  }
  return gameGrid;
}

//GAME LOGIC
function gameController(idx) {
  if (!grid.isRevealed[idx[0]][idx[1]]) {
    checkGrid(idx);
    checkWin();
  }

  render(); //Render the game state, then check if special rendering is needed for win/loss

  if (game.end) {
    if (game.win) {
      //Victory screen
      renderWin();
    } else {
      //Loss screen
      renderLoss();
    }
  }
}

function checkGrid(idx) {
  //Check the game grid for what is at the given index
  grid.isRevealed[idx[0]][idx[1]] = true;

  let symb = grid.matrix[idx[0]][idx[1]];
      
  if (symb === 'X') {
    if ((game.safeSquaresRevealed < 1) && (grid.mines < 0.9 * grid.area) && (grid.rearrangeCounter < 10)) {
      //Rearrange grid if struck a mine on the first click and not going overboard with the number of mines in the grid - max ten attempts before just making you lose.
      //i.e. make it so you don't loose on the first click
      console.log(`Rearranging grid so you don't loose on the first click: Attempt ${grid.rearrangeCounter+1}`);
      grid.rearrangeCounter += 1;
      setupGameMatrices(); //remake gamestate matrix
      checkGrid(idx); //retry index and check for mines
    } else {
      //Struck a mine!!
      //Game over!
      loseGame();
    }
  } else if (symb === 0) {
    game.safeSquaresRevealed += 1;
    //check adjacent grid for blanks
    // console.log('Blank');

    //If the revealed square is blank, reveal the adjacent ones and then check if they are adjacent to any blanks

    //Get adjacent 
    let adjGridEls = findAdjacentGrids(Number(idx[0]),Number(idx[1]));
    let adjGrid = adjGridEls.filter(x=>( //filter out grid indices that are outside the grid 
      (x[0]>=0) && (x[0] < grid.rows) && (x[1]>=0) && (x[1] < grid.cols)
    ));
    //iterate through adjacent grid elements to see if any can be auto-revealed
    for (adjGridIdx of adjGrid) {
      if ((grid.matrix[adjGridIdx[0]][adjGridIdx[1]] != 'X') && !grid.isRevealed[adjGridIdx[0]][adjGridIdx[1]]) {
        grid.isRevealed[adjGridIdx[0]][adjGridIdx[1]] = true;

        checkGrid(adjGridIdx); //Call this whole function again on the revealed grid tiles and check the tiles adjacent to those
      }
    }
  } else {
    //You clicked on a nmber tile and nothing special happens
    game.safeSquaresRevealed += 1;
  }
}

function findAdjacentGrids(r, c) {
  //Return the index of adjacent (incl. diagonal) grid elements to the input row (r) and column (c)
  let gT = [r-1,c]; //grid TOP
  let gTR = [r-1,c+1]; //grid TOP RIGHT
  let gR = [r,c+1]; //grid RIGHT
  let gBR = [r+1,c+1]; //grid BOTTOM RIGHT
  let gB = [r+1,c]; //grid BOTTOM
  let gBL = [r+1,c-1]; //grid BOTTOM LEFT
  let gL = [r,c-1]; //grid LEFT
  let gTL = [r-1,c-1]; //grid TOP LEFT

  return [gT,gTR,gR,gBR,gB,gBL,gL,gTL];
}

function checkWin() {
  //Check to see if the player has won the game by revealing every square that is NOT a mine
  const gridArea = grid.area;
  const numMines = grid.mines;
  
  if (game.safeSquaresRevealed >= gridArea - numMines) {
    winGame();
  }
}

function winGame() {
  //Set game state to a win and reveal mines
  console.log('YOU WIN!');
  game.end = true;
  game.win = true;
  revealMines();
}

function loseGame() {
  //Set game state to a loss and set grid to reveal all mines (X) on the screen
  game.end = true;
  game.win = false;
  game.losingIndex = idx;
  revealMines();
}

function revealMines() {
  //Sets all the mines in the grid to "revealeD" meanign they will show up in the next render
  for (row in grid.matrix) {
    for (col in grid.matrix[row]) {
      if (grid.matrix[row][col] === 'X') {
        grid.isRevealed[row][col] = true;
      }
    }
  }
}

//user interaction
function clickTracker(event) {
  const evEl = event.target;
  if (evEl.id === 'startGame') {
    if (cache.mineSel.value < cache.rowSel.value * cache.colSel.value) {
      initialiseGame(); //End setup and start the game
    } else {
      console.log("You have too many mines for this grid size!"); //Shouldn't need this but have it here just in case
    }

  } else if (evEl.classList.contains('minesweeperGrid') && !game.end) {
    // console.log(`You clicked grid no: ${event.target.id}`);

    idx=(event.target.id.split('-')); //turn element clicked ID into a grid reference
    gameController(idx); //send the grid clicked into the game controller for logic calculations
    
  }
}

//UI
function render() {
  //display gamestate on screen
  for (i in grid.matrix) {
    for (j in grid.matrix[i]) {
      let gridEl = document.getElementById(i+'-'+j);
      if (grid.isRevealed[i][j]) {
        gridEl.style.backgroundColor = '#e6e6e6'; //reveal square color
        gridEl.innerText = grid.matrix[i][j]; //set text to value in grid matrix

        gridEl.style.color = getTextColor(i,j); //get colour of number
        if (grid.matrix[i][j] === 0) {
          gridEl.style.fontSize = '0px'; //hide text if it is a zero
        } else if (grid.matrix[i][j] === 'X') {
          gridEl.innerHTML = `<img src='https://imgur.com/jDSo65w.png' width=90%></img>`; //Put on the bomb image!
        }
      }
    }
  }
}

function getTextColor(r,c){
  let colorStr = '';
  switch (grid.matrix[r][c]) {
    case 0: colorStr='white'; break;
    case 1: colorStr='blue'; break;
    case 2: colorStr='green'; break;
    case 3: colorStr='red'; break;
    case 4: colorStr='purple'; break;
    case 5: colorStr='black'; break;
    case 6: colorStr='grey'; break;
    case 7: colorStr='maroon'; break;
    case 8: colorStr='turquoise'; break;
    default: colorStr = 'firebrick';
  }
  // console.log(colorStr)
  return colorStr;
}

function renderLoss() {
  //GAME OVER UI  
  console.log('GAME OVER');
  //Highlight only the losing mine
  let r = game.losingIndex[0];
  let c = game.losingIndex[1];
  let gridEl = document.getElementById(r+'-'+c);
  
  gridEl.innerHTML = `<img src='https://imgur.com/7NUhadT.png' width=90%></img>`; //Explosion!
  gridEl.style.backgroundColor = 'rgba(255,200,200,1)'; //highlight losing mine

  //Highlight incorrectly marked mines


  //


}

function renderWin() {

}



startupGame(); //Start the setup for the game and lets go!