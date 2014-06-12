(function(root) {
  var Game = root.Game = (root.Game || {});

  var Board = Game.Board = function() {
    this.snake = new Game.Snake();
    this.apple = this.randomApple();
  };
  
  Board.prototype.randomApple = function() {
    var pos = Board.randomPosition();
    
    while(_.some(this.snake.body, function(part) {
      _.isEqual(part, pos);
    })) { pos = Board.randomPosition(); };
    
    return pos;
  };
  
  Board.randomPosition = function() {
    return [
        Math.floor(Math.random()*20),
        Math.floor(Math.random()*20)
      ];
  }
  
  Board.prototype.render = function($board) {
    $board.children('.snake').removeClass('snake snake-head snake-body');
    // remove apples, too
    // console.log(this.snake);
    var body = this.snake.body;
    
    
    // part = [i,j]
    body.forEach(function(part, index){
      var $segment = $board.children("[data-row="+part[0]+"][data-col="+part[1]+"]");
      $segment.removeClass("apple").addClass("snake");
      if(index === body.length - 1) {
        $segment.addClass("snake-head");
      } else {
        $segment.addClass("snake-body");
      };
    });
    var $apple = $board.children("[data-row="+this.apple[0]+"][data-col="+this.apple[1]+"]");
    $apple.addClass('apple');
  };
    
})(window);