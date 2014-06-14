(function(root){
  
  var Game = root.Game = (root.Game || {});
  
  var SnakeUI = Game.SnakeUI = function($boardUL) {
    this.board = new Game.Board();
    this.board.init();

    this.$boardUL = $boardUL;
    this.nextDirection = this.board.snake.direction;

    this.drunk = false;
    this.drunkCountDown = 0;

    this.teleported = false;
    this.portalCountDown = 0;
  };

  SnakeUI.prototype.initializeBoard = function($boardUL) {
    var boardLI = [];

    for(var i = 0; i < 400; i++) {
      var row = Math.floor(i / 20);
      var col = i % 20;
      
      boardLI.push(
        "<li data-row='" + row + "' data-col='" + col + "'></li>"
      );
    };
    
    this.$boardUL.html(boardLI.join(""));
  }
  
  SnakeUI.prototype.start = function() {
    this.initializeBoard(this.$boardUL);
    
    $(window).keydown(this.handleKeyEvent.bind(this));

    $('.message').text("Current score: 0");
        
    this.interval = setInterval(this.step.bind(this), 200);
  };

  SnakeUI.prototype.score = function() {
    return (this.board.snake.body.length - 6) * 10;
  }

  SnakeUI.prototype.checkForCollision = function() {
    var snake = this.board.snake;

    if( snake.body.slice(0, snake.body.length - 1).some(

      function(part){
        return _.isEqual(part, snake.head()); 
      })) { 
      return true; 
    } else { 
      return false; 
    }
  };

  SnakeUI.prototype.checkForConsumption = function() {
    var snake = this.board.snake;
    var apple = this.board.apple;

    if (_.isEqual(snake.nextPosition(), apple)) {
      return true; 
    } else { 
      return false;
    };     
  };

  SnakeUI.prototype.moveSnake = function() {
    var board = this.board;
    var snake = board.snake;
    var portals = board.portals;

    if( this.checkForConsumption() ) {
      snake.grow();
      snake.move();
      board.addApple();
      this.updateScore();
      this.updateInterval();
    } else if (this.checkForTeleport() ) {
      if ( _.isEqual(snake.nextPosition(), portals[0]) ) {
        snake.teleport(portals[1]);
      } else {
        snake.teleport(portals[0]);
      };

      this.portalCountDown = 1;
      this.teleported = true;
    } else {
      snake.move();
    } 

    if(this.portalCountDown === 1) {
      this.portalCountDown -= 1;
    } else if (this.teleported) {
      $('.portal').removeClass('portal');
      board.newPortals();
      this.teleported = false;
    }
  }

  SnakeUI.prototype.updateScore = function() {
    $('.message').text("Current score: " + this.score());
  }

  SnakeUI.prototype.updateInterval = function() {
    var snake = this.board.snake;

    clearInterval(this.interval);
    this.interval = setInterval(this.step.bind(this), 1200 / snake.body.length);
  }

  SnakeUI.prototype.checkForTeleport = function() {
    var snake = this.board.snake;
    var portals = this.board.portals;

    return ( _.isEqual(snake.nextPosition(), portals[0]) || 
             _.isEqual(snake.nextPosition(), portals[1])
           );
  };

  SnakeUI.prototype.endGame = function() {
    clearInterval(this.interval);
    $('.message').text("Game Over!  Final score: " + this.score());
  }
  
  SnakeUI.prototype.step = function() {
    var snake = this.board.snake;
    var apple = this.board.apple;
    
    snake.turn(this.nextDirection);

    this.moveSnake();

    if (this.checkForCollision()) {
      this.endGame();
    };
    
    this.render();
  }

  SnakeUI.prototype.supressDefault = function(event) {
    if([37, 38, 39, 40].indexOf(event.keyCode) !== -1) {
      event.preventDefault();
    }    
  }
  
  SnakeUI.prototype.handleKeyEvent = function(event) {
    var snake = this.board.snake;

    this.supressDefault(event);

    switch(event.keyCode) {
    case 37:
      if(!_.isEqual(snake.direction, [0, 1])) {
        this.nextDirection = [0, -1];
      }; break;   
    case 38:
      if(!_.isEqual(snake.direction, [1, 0])) {
        this.nextDirection = [-1, 0];
      }; break; 
    case 39:
      if(!_.isEqual(snake.direction, [0, -1])) {
        this.nextDirection = [0, 1];
      }; break; 
    case 40:
      if(!_.isEqual(snake.direction, [-1, 0])) {
        this.nextDirection = [1, 0];
      }; break; 
    };
  };

  SnakeUI.prototype.handleDrunkKeyEvent = function(event) {
    var snake = this.board.snake;
    
    this.supressDefault(event);

    switch(event.keyCode) {
    case 37:
      if(!_.isEqual(snake.direction, [0, 1])) {
        this.nextDirection = [0, -1];
      }; break;   
    case 38:
      if(!_.isEqual(snake.direction, [1, 0])) {
        this.nextDirection = [-1, 0];
      }; break; 
    case 39:
      if(!_.isEqual(snake.direction, [0, -1])) {
        this.nextDirection = [0, 1];
      }; break; 
    case 40:
      if(!_.isEqual(snake.direction, [-1, 0])) {
        this.nextDirection = [1, 0];
      }; break; 
    };    
  };

 
 SnakeUI.prototype.render = function() {
   this.board.render(this.$boardUL)
 };
  
})(window);