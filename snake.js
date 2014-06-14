(function(root) {
  var Game = root.Game = (root.Game || {});

  var Snake = Game.Snake = function() {
    this.body = Snake.createBody();
    this.direction = [0, 1];
  };
  
  Snake.createBody = function () {
    var body = [];
    for (var i = 0; i < 6; i++) {
      body.push([10, i]);
    }
    return body;
  };

  Snake.prototype.head = function () {
    return this.body.slice(-1)[0];
  }
  
  Snake.prototype.move = function () {
    this.body.shift();
    this.grow();
  };
  
  Snake.prototype.grow = function () {
    this.body.push(this.nextPosition());
  };

  Snake.prototype.teleport = function (toPortal) {
    this.body.shift();
    this.body.push(toPortal);
  }
  
  Snake.prototype.nextPosition = function() {
    var headCoord = this.head();
    
    var x = headCoord[0] + this.direction[0];
    var y = headCoord[1] + this.direction[1];
    
    var nextX = x < 0 ? x + 20 : x % 20;
    var nextY = y < 0 ? y + 20 : y % 20;
    
    return [nextX, nextY];
  };
  
  Snake.prototype.turn = function(direction) {
    this.direction = direction;
  };
})(window);