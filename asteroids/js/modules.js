var Tickable = {
  tick: function () {
    if (this.fire) { this.fire(); };
    if (this.accelerate) { this.accelerate(); };
    if (this.slow) { this.slow(); };
    if (this.move) { this.move(); };
    if (this.spin) { this.spin(); };
    if (this.wrap) { this.wrap(); };
    if (this.expire) { this.expire(); };
  }
};

var Expirable = {
  expire: function () {
    if (Math.abs(this.xPos) > this.game.width / 2 ||
      Math.abs(this.yPos) > this.game.height / 2) {
      this.game.remove( this );
    }
  }
}

var Collidable = {
  collide: function (otherObj) {
    var distance = Math.sqrt(
      (this.xPos - otherObj.xPos) * (this.xPos - otherObj.xPos)  +
      (this.yPos - otherObj.yPos) * (this.yPos - otherObj.yPos)
    );

    if (distance < this.hitRadius + otherObj.hitRadius) {
      return true;
    } else {
      return false;
    };
  }
}

var Firable = {
  fire: function () {
    // here there be changes
    this.fireCount = this.fireCount || this.fireSpeed;

    if (this.firing) {
      if (this.fireCount == this.fireSpeed) {
        var bullet = new Bullet( this.game );
        this.game.add( bullet );
        this.fireCount = 1;
      } else {
        this.fireCount += 1;
      };
    };
  }
};

var Movable = {
  move: function () {
    this.theta += 3 * this.rotation * Math.PI / 180;

    // this means that we move
    this.xPos += Math.sin( this.theta ) * this.speed;
    this.yPos += Math.cos( this.theta ) * this.speed;
  }
};

var Accelerable = {
  accelerate: function () {
    this.speed += this.acceleration;

    // this limits our speed
    this.speed = Math.max(-this.maxSpeed, Math.min(this.speed, this.maxSpeed));
  }
}

var Slowable = {
  slow: function () {
    // this guarantees we shop eventually
    this.speed *= 0.97;
  }
};

var Wrappable = {
  wrap: function () {
    var width = this.context.canvas.width;
    var height = this.context.canvas.height;

    // here there be changes
    var x = this.xPos, y = this.yPos;

    this.xPos = (x + 3 * width/2) % width - width/2;
    this.yPos = (y + 3 * height/2) % height - height/2;
  }
};

var Spinnable = {
  spin: function () {
    this.spinTotal += this.spinSpeed;
  }
};
