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
    
    $('body').keydown(this.handleKeyEvent.bind(this));
    $('.message').text("Current score: " + (this.board.snake.body.length - 10) * 10);
        
    this.interval = setInterval(this.step.bind(this), 150);
  };
  
  SnakeUI.prototype.step = function() {
    var snake = this.board.snake;
    var apple = this.board.apple;
    
    snake.turn(this.nextDirection);
    
    if(snake.body.slice(1).some(function(part){
      return _.isEqual(part, snake.nextPosition()); })) {
      
        $('.message').text("Game Over, final score: " + (snake.body.length - 10) * 10);
        clearInterval(this.interval);
    }
    
    if (_.isEqual(snake.nextPosition(), apple)) {
      snake.grow();
      this.board.apple = this.board.randomApple();
      $('.message').text("Current score: " + (snake.body.length - 10) * 10);
      clearInterval(this.interval);
      this.interval = setInterval(this.step.bind(this), 1500 / snake.body.length);
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
  }
 
 SnakeUI.prototype.render = function() {
   this.board.render(this.$boardUL)
 }
  
})(window);