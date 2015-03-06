function Ship (game) {
  this.game = game; // coupling alert!
  this.context = game.context;

  this.xPos = 0;
  this.yPos = 0;

  this.theta = 0;
  this.rotation = 0; // -1, 0, 1

  this.hitRadius = 8;

  this.speed = 0;
  this.maxSpeed = 20;
  this.acceleration = 0;

  this.firing = false;

  // here there be changes
  // let's not fire every update
  this.fireSpeed = 8;

  this.class = 'ship';
  this.asset = this.game.assets.ship;

  this.render();
};

// class methods
_.extend(Ship, {

});

// instance methods
_.extend(Ship.prototype, {
  activate: function (code) {
    switch (code) {
    case 32:
      this.firing = true;
      break;
    case 37:
      this.rotation = -1;
      break;
    case 38:
      this.acceleration = 1;
      break;
    case 39:
      this.rotation = 1;
      break;
    case 40:
      this.acceleration = -1;
      break;
    };
  },

  deactivate: function (code) {
    switch (code) {
    case 32:
      this.firing = false;
      break;
    case 37:
      this.rotation = 0;
      break;
    case 38:
      this.acceleration = 0;
      break;
    case 39:
      this.rotation = 0;
      break;
    case 40:
      this.acceleration = 0;
      break;
    };
  },

  render: function () {
    var c = this.context;

    c.save();
    c.translate( this.xPos, this.yPos );
    c.rotate( Math.PI - this.theta );
    c.scale( 0.5, 0.5 )
    c.drawImage( this.asset, -64, -64 );
    c.restore();
  }
}, Tickable, Firable, Movable, Accelerable, Slowable, Wrappable, Collidable);
