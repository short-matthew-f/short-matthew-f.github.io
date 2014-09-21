(function(root) {
  var Game = root.Game = (root.Game || {});

  var Board = Game.Board = function() {
    this.snake = new Game.Snake();
  };

  Board.prototype.init = function() {
    this.apple = this.newApple();
    this.newPortals();
  }

  Board.prototype.addApple = function() {
    this.apple = this.newApple();
  }
  
  Board.prototype.newApple = function() {
    return this.emptyPosition();
  };

  Board.prototype.newPortals = function() {
    this.portals = [this.emptyPosition()];
    this.portals.push(this.emptyPosition());
  }

  Board.prototype.emptyPosition = function() {
    var pos = Board.randomPosition();

    while(
      _.some(this.snake.body, function(part) {
        return _.isEqual(part, pos);
      }) || _.some(this.portals, function(portal) {
        return _.isEqual(portal, pos);
      })) {
      pos = Board.randomPosition();
    }

    return pos;
  };
  
  Board.randomPosition = function() {
    return [
        Math.floor(Math.random()*20),
        Math.floor(Math.random()*20)
      ];
  };
  
  Board.prototype.render = function($board) {
    this.renderSnake($board);
    this.renderApple($board);
    this.renderPortals($board);
  };

  Board.prototype.renderSnake = function($board) {
    $board.children('.snake').removeClass('snake snake-head snake-body');
    var body = this.snake.body;

    body.forEach(function(part, index){
      var $segment = $board.children("[data-row="+part[0]+"][data-col="+part[1]+"]");

      $segment.removeClass("apple").addClass("snake");

      if(index === body.length - 1) {
        $segment.addClass("snake-head");
      } else {
        $segment.addClass("snake-body");
      };
    });   
  };

  Board.prototype.renderApple = function($board) {
    var apple = this.apple;

    var $apple = $board.children("[data-row="+apple[0]+"][data-col="+apple[1]+"]");
    $apple.addClass('apple');
  };

  Board.prototype.renderPortals = function($board) {
    var portalOne = this.portals[0];
    var portalTwo = this.portals[1];

    var $portOne = $board.children("[data-row="+portalOne[0]+"][data-col="+portalOne[1]+"]");
    var $portTwo = $board.children("[data-row="+portalTwo[0]+"][data-col="+portalTwo[1]+"]");

    $portOne.addClass('portal');
    $portTwo.addClass('portal');
  };
    
})(window);