'use strict';

var hasPrimaryModifier = require('../../util/Mouse').hasPrimaryModifier,
    substract = require('../../util/Math').substract;


var HIGH_PRIORITY = 1500;


function HandTool(eventBus, canvas, dragging, toolManager) {
  this._dragging = dragging;


  toolManager.registerTool('hand', {
    tool: 'hand',
    dragging: 'hand.move'
  });

  eventBus.on('element.mousedown', HIGH_PRIORITY, function(event) {
    if (hasPrimaryModifier(event)) {
      this.activateMove(event.originalEvent);

      return false;
    }
  }, this);


  eventBus.on('hand.end', function(event) {
    var target = event.originalEvent.target;

    // only reactive on diagram click
    // on some occasions, event.hover is not set and we have to check if the target is an svg
    if (!event.hover && !(target instanceof SVGElement)) {
      return false;
    }

    eventBus.once('hand.ended', function() {
      this.activateMove(event.originalEvent, { reactivate: true });
    }, this);

  }, this);

  eventBus.on('hand.move.start', function(event) {
    var context = event.context;

    context.start = { x: event.x, y: event.y };
  });

  eventBus.on('hand.move.move', function(event) {
    var context = event.context,
        start = context.start,
        delta = context.delta;

    var position = { x: event.x, y: event.y },
        scale = canvas.viewbox().scale;

    var lastPosition = context.last || start;

    delta = substract(position, lastPosition);

    canvas.scroll({
      dx: delta.x * scale,
      dy: delta.y * scale
    });

    context.last = position;
  });

  eventBus.on('hand.move.end', function(event) {
    var context = event.context,
        reactivate = context.reactivate;

    // Don't reactivate if the user is using the keyboard keybinding
    if (!hasPrimaryModifier(event) && reactivate) {

      eventBus.once('hand.move.ended', function(event) {
        this.activateHand(event.originalEvent, true, true);
      }, this);

    }

    return false;
  }, this);

}

HandTool.$inject = [
  'eventBus',
  'canvas',
  'dragging',
  'toolManager'
];

module.exports = HandTool;


HandTool.prototype.activateMove = function(event, autoActivate, context) {
  if (typeof autoActivate === 'object') {
    context = autoActivate;
    autoActivate = false;
  }

  this._dragging.activate(event, 'hand.move', {
    autoActivate: autoActivate,
    cursor: 'move',
    data: {
      context: context || {}
    }
  });
};

HandTool.prototype.activateHand = function(event, autoActivate, reactivate) {
  this._dragging.activate(event, 'hand', {
    trapClick: false,
    autoActivate: autoActivate,
    cursor: 'move',
    data: {
      context: {
        reactivate: reactivate
      }
    }
  });
};

HandTool.prototype.toggle = function() {
  if (this.isActive()) {
    this._dragging.cancel();
  } else {
    this.activateHand();
  }
};

HandTool.prototype.isActive = function() {
  var active = this._dragging.active();

  return active && /^hand/.test(active.prefix);
};