(function(root){
  "use strict";
  
  var Game = root.Game = (root.Game || {});
  
  var SnakeUI = Game.SnakeUI = function($boardUL) {
    this.board = new Game.Board();
    this.$boardUL = $boardUL;
    this.nextDirection = this.board.snake.direction;
  }
  
  SnakeUI.prototype.start = function() {
    var boardLI = [];
    
    for(var i = 0; i < 400; i++) {
      var row = Math.floor(i / 20);
      var col = i % 20;
      
      boardLI.push(
        "<li data-row='" + row + "' data-col='" + col + "'></li>"
      );
    };
    
    this.$boardUL.html(boardLI.join(""));
    
    $(window).keydown(this.handleKeyEvent.bind(this));

    $('.message').text("Current score: 0");
        
    this.interval = setInterval(this.step.bind(this), 200);
  };

  SnakeUI.prototype.score = function() {
    return (this.board.snake.body.length - 6) * 10;
  }
  
  SnakeUI.prototype.step = function() {
    var snake = this.board.snake;
    var apple = this.board.apple;
    
    snake.turn(this.nextDirection);
    
    if(snake.body.slice(1).some(function(part){
      return _.isEqual(part, snake.nextPosition()); })) {
      
        $('.message').text("Game over! Final score: " + this.score());
        clearInterval(this.interval);
    }
    
    if (_.isEqual(snake.nextPosition(), apple)) {
      snake.grow();
      this.board.apple = this.board.randomApple();
      $('.message').text("Current score: " + this.score());
      clearInterval(this.interval);
      this.interval = setInterval(this.step.bind(this), 1200 / snake.body.length);
    } else {
      snake.move();
    };
    
    this.render();
  }
  
  SnakeUI.prototype.handleKeyEvent = function(event) {
    var snake = this.board.snake;
    switch(event.keyCode) {
    case 37:
      if(!_.isEqual(snake.direction, [0, 1])) {
        event.preventDefault();
        this.nextDirection = [0, -1];
      }; break;   
    case 38:
      if(!_.isEqual(snake.direction, [1, 0])) {
        event.preventDefault();
        this.nextDirection = [-1, 0];
      }; break; 
    case 39:
      if(!_.isEqual(snake.direction, [0, -1])) {
        event.preventDefault();
        this.nextDirection = [0, 1];
      }; break; 
    case 40:
      if(!_.isEqual(snake.direction, [-1, 0])) {
        event.preventDefault();
        this.nextDirection = [1, 0];
      }; break; 
    };
  }
 
 SnakeUI.prototype.render = function() {
   this.board.render(this.$boardUL)
 }
  
})(window);