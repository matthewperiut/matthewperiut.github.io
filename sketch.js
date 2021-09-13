
let rimg;
let fimg;

function preload()
{
    rimg = loadImage('assets/player.png'); // regular
    fimg = loadImage('assets/fplayer.png'); // flip
}

function setup()
{
    createCanvas(windowWidth, windowHeight);
    noSmooth();
}

var left = false;
var right = false;

var vx = 0;
var vy = 0;
var x = 50;
var y = 0;
var playerScale = 50;
var canJump = false;
var wantsJump = false;

function draw() {
    background(220);
    if(vx < 0)
      image(fimg,x,y,playerScale,playerScale);
    else if(vx => 0)
      image(rimg,x,y,playerScale,playerScale);

    vx = 0;
    if(right)
      vx += 10;
    if(left)
      vx -= 10;

    if (x < 0)
    {
      x = 0;
    }
    if (y > height - playerScale) // fifty due to player height
    {
      y = 350;
      vy = 0;
    }
    else {
      vy += 2 * (deltaTime/50);
    }
    if (y == height - playerScale)
    {
      canJump = true;
    }
    else {
      canJump = false;
    }
    if(wantsJump && canJump)
    {
      vy = -20;
    }

    var newx = x + vx * (deltaTime/50);
    var newy = y + vy * (deltaTime/50);

    if(newy > height - playerScale)
    {
      y = height - playerScale;
      vy = 0;
    }
    else
    {
      y = newy;
    }

    if(!(newx < 0 || newx > width - playerScale))
    {
      x = newx;
    }

    if(y == height - playerScale)
    {
      vy = 0;
    }
}

function windowResized()
{
  resizeCanvas(windowWidth, windowHeight);
  if(x > windowWidth-playerScale)
    x = width-playerScale;
  if(y > windowHeight)
    y = height-playerScale;
}

function keyPressed()
{
  if (keyCode === 68) // ASCII D
  {
    right = true;
  }
  if (keyCode === 65) // ASCII A
  {
    left = true;
  }
  if (keyCode === 32) // ASCII space
  {
    wantsJump = true;
  }
}

function keyReleased()
{
  if (keyCode === 68) // ASCII D
  {
    right = false;
  }
  if (keyCode === 65) // ASCII A
  {
    left = false;
  }
  if (keyCode === 32) // ASCII space
  {
    wantsJump = false;
  }
}
