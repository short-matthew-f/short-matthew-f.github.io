function Bullet (game) {
  this.game       = game;
  this.ship       = game.ship;
  this.context    = game.context;

  this.class      = 'bullet';
  this.asset      = game.assets.bullet;

  this.setInitialValues();
};

_.extend(Bullet, {

});

_.extend(Bullet.prototype, {
  setInitialValues: function () {
    this.theta = this.ship.theta;

    // here there be changes
    this.xPos = this.ship.xPos +
                (20 + this.ship.speed) * Math.sin( this.theta );
    this.yPos = this.ship.yPos +
                (20 + this.ship.speed) * Math.cos( this.theta );

    this.hitRadius = 4;

    this.speed = this.ship.maxSpeed + 5;
    this.rotation = 0;
  },

  render: function () {
    var c = this.context;

    c.save();
    c.translate( this.xPos, this.yPos );
    c.scale( 0.5, 0.5 )
    c.drawImage( this.asset, -16, -16 );
    c.restore();
  }
}, Tickable, Movable, Expirable, Collidable); // wrappable?
