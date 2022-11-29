function Node(obj, dimension, parent) {
  this.obj = obj;
  this.left = null;
  this.right = null;
  this.parent = parent;
  this.dimension = dimension;
}

function kdTree(points, metric, dimensions) {
  var self = this;

  function buildTree(points, depth, parent) {
    var dim = depth % dimensions.length,
      median,
      node;

    if (points.length === 0) {
      return null;
    }
    if (points.length === 1) {
      return new Node(points[0], dim, parent);
    }

    points.sort(function (a, b) {
      return a[dimensions[dim]] - b[dimensions[dim]];
    });

    median = Math.floor(points.length / 2);
    node = new Node(points[median], dim, parent);
    node.left = buildTree(points.slice(0, median), depth + 1, node);
    node.right = buildTree(points.slice(median + 1), depth + 1, node);

    return node;
  }

  function loadTree(data) {
    self.root = data;

    function restoreParent(root) {
      if (root.left) {
        root.left.parent = root;
        restoreParent(root.left);
      }

      if (root.right) {
        root.right.parent = root;
        restoreParent(root.right);
      }
    }

    restoreParent(self.root);
  }

  if (!Array.isArray(points)) loadTree(points, metric, dimensions);
  else this.root = buildTree(points, 0, null);

  this.toJSON = function (src) {
    if (!src) src = this.root;
    var dest = new Node(src.obj, src.dimension, null);
    if (src.left) dest.left = self.toJSON(src.left);
    if (src.right) dest.right = self.toJSON(src.right);
    return dest;
  };

  this.insert = function (point) {
    function innerSearch(node, parent) {
      if (node === null) {
        return parent;
      }

      var dimension = dimensions[node.dimension];
      if (point[dimension] < node.obj[dimension]) {
        return innerSearch(node.left, node);
      } else {
        return innerSearch(node.right, node);
      }
    }

    var insertPosition = innerSearch(this.root, null),
      newNode,
      dimension;

    if (insertPosition === null) {
      this.root = new Node(point, 0, null);
      return;
    }

    newNode = new Node(
      point,
      (insertPosition.dimension + 1) % dimensions.length,
      insertPosition
    );
    dimension = dimensions[insertPosition.dimension];

    if (point[dimension] < insertPosition.obj[dimension]) {
      insertPosition.left = newNode;
    } else {
      insertPosition.right = newNode;
    }
  };

  this.remove = function (point) {
    var node;

    function nodeSearch(node) {
      if (node === null) {
        return null;
      }

      if (node.obj === point) {
        return node;
      }

      var dimension = dimensions[node.dimension];

      if (point[dimension] < node.obj[dimension]) {
        return nodeSearch(node.left, node);
      } else {
        return nodeSearch(node.right, node);
      }
    }

    function removeNode(node) {
      var nextNode, nextObj, pDimension;

      function findMin(node, dim) {
        var dimension, own, left, right, min;

        if (node === null) {
          return null;
        }

        dimension = dimensions[dim];

        if (node.dimension === dim) {
          if (node.left !== null) {
            return findMin(node.left, dim);
          }
          return node;
        }

        own = node.obj[dimension];
        left = findMin(node.left, dim);
        right = findMin(node.right, dim);
        min = node;

        if (left !== null && left.obj[dimension] < own) {
          min = left;
        }
        if (right !== null && right.obj[dimension] < min.obj[dimension]) {
          min = right;
        }
        return min;
      }

      if (node.left === null && node.right === null) {
        if (node.parent === null) {
          self.root = null;
          return;
        }

        pDimension = dimensions[node.parent.dimension];

        if (node.obj[pDimension] < node.parent.obj[pDimension]) {
          node.parent.left = null;
        } else {
          node.parent.right = null;
        }
        return;
      }

      if (node.right !== null) {
        nextNode = findMin(node.right, node.dimension);
        nextObj = nextNode.obj;
        removeNode(nextNode);
        node.obj = nextObj;
      } else {
        nextNode = findMin(node.left, node.dimension);
        nextObj = nextNode.obj;
        removeNode(nextNode);
        node.right = node.left;
        node.left = null;
        node.obj = nextObj;
      }
    }

    node = nodeSearch(self.root);

    if (node === null) {
      return;
    }

    removeNode(node);
  };

  this.nearest = function (point, maxNodes, maxDistance) {
    var i, result, bestNodes;

    bestNodes = new BinaryHeap(function (e) {
      return -e[1];
    });

    function nearestSearch(node) {
      var bestChild,
        dimension = dimensions[node.dimension],
        ownDistance = metric(point, node.obj),
        linearPoint = {},
        linearDistance,
        otherChild,
        i;

      function saveNode(node, distance) {
        bestNodes.push([node, distance]);
        if (bestNodes.size() > maxNodes) {
          bestNodes.pop();
        }
      }

      for (i = 0; i < dimensions.length; i += 1) {
        if (i === node.dimension) {
          linearPoint[dimensions[i]] = point[dimensions[i]];
        } else {
          linearPoint[dimensions[i]] = node.obj[dimensions[i]];
        }
      }

      linearDistance = metric(linearPoint, node.obj);

      if (node.right === null && node.left === null) {
        if (bestNodes.size() < maxNodes || ownDistance < bestNodes.peek()[1]) {
          saveNode(node, ownDistance);
        }
        return;
      }

      if (node.right === null) {
        bestChild = node.left;
      } else if (node.left === null) {
        bestChild = node.right;
      } else {
        if (point[dimension] < node.obj[dimension]) {
          bestChild = node.left;
        } else {
          bestChild = node.right;
        }
      }

      nearestSearch(bestChild);

      if (bestNodes.size() < maxNodes || ownDistance < bestNodes.peek()[1]) {
        saveNode(node, ownDistance);
      }

      if (
        bestNodes.size() < maxNodes ||
        Math.abs(linearDistance) < bestNodes.peek()[1]
      ) {
        if (bestChild === node.left) {
          otherChild = node.right;
        } else {
          otherChild = node.left;
        }
        if (otherChild !== null) {
          nearestSearch(otherChild);
        }
      }
    }

    if (maxDistance) {
      for (i = 0; i < maxNodes; i += 1) {
        bestNodes.push([null, maxDistance]);
      }
    }

    if (self.root) nearestSearch(self.root);

    result = [];

    for (i = 0; i < Math.min(maxNodes, bestNodes.content.length); i += 1) {
      if (bestNodes.content[i][0]) {
        result.push([bestNodes.content[i][0].obj, bestNodes.content[i][1]]);
      }
    }
    return result;
  };

  this.balanceFactor = function () {
    function height(node) {
      if (node === null) {
        return 0;
      }
      return Math.max(height(node.left), height(node.right)) + 1;
    }

    function count(node) {
      if (node === null) {
        return 0;
      }
      return count(node.left) + count(node.right) + 1;
    }

    return height(self.root) / (Math.log(count(self.root)) / Math.log(2));
  };
}

function BinaryHeap(scoreFunction) {
  this.content = [];
  this.scoreFunction = scoreFunction;
}

BinaryHeap.prototype = {
  push: function (element) {
    this.content.push(element);
    this.bubbleUp(this.content.length - 1);
  },

  pop: function () {
    var result = this.content[0];
    var end = this.content.pop();
    if (this.content.length > 0) {
      this.content[0] = end;
      this.sinkDown(0);
    }
    return result;
  },

  peek: function () {
    return this.content[0];
  },

  remove: function (node) {
    var len = this.content.length;
    for (var i = 0; i < len; i++) {
      if (this.content[i] == node) {
        var end = this.content.pop();
        if (i != len - 1) {
          this.content[i] = end;
          if (this.scoreFunction(end) < this.scoreFunction(node))
            this.bubbleUp(i);
          else this.sinkDown(i);
        }
        return;
      }
    }
    throw new Error("Node not found.");
  },

  size: function () {
    return this.content.length;
  },

  bubbleUp: function (n) {
    var element = this.content[n];
    while (n > 0) {
      var parentN = Math.floor((n + 1) / 2) - 1,
        parent = this.content[parentN];
      if (this.scoreFunction(element) < this.scoreFunction(parent)) {
        this.content[parentN] = element;
        this.content[n] = parent;
        n = parentN;
      } else {
        break;
      }
    }
  },

  sinkDown: function (n) {
    var length = this.content.length,
      element = this.content[n],
      elemScore = this.scoreFunction(element);

    while (true) {
      var child2N = (n + 1) * 2,
        child1N = child2N - 1;
      var swap = null;
      if (child1N < length) {
        var child1 = this.content[child1N],
          child1Score = this.scoreFunction(child1);
        if (child1Score < elemScore) swap = child1N;
      }
      if (child2N < length) {
        var child2 = this.content[child2N],
          child2Score = this.scoreFunction(child2);
        if (child2Score < (swap == null ? elemScore : child1Score)) {
          swap = child2N;
        }
      }

      if (swap != null) {
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      } else {
        break;
      }
    }
  },
};

const getRectangleEdges = (item) => {
  return {
    x0: item.x - item.w / 2,
    y0: item.y - item.h / 2,
    x1: item.x + item.w / 2,
    y1: item.y + item.h / 2,
  };
};

/* Intersection over union */
const iouAreas = (item1, item2) => {
  var rect1 = getRectangleEdges(item1);
  var rect2 = getRectangleEdges(item2);

  var overlap_x0 = Math.max(rect1.x0, rect2.x0);
  var overlap_y0 = Math.max(rect1.y0, rect2.y0);
  var overlap_x1 = Math.min(rect1.x1, rect2.x1);
  var overlap_y1 = Math.min(rect1.y1, rect2.y1);

  if (overlap_x1 - overlap_x0 <= 0 || overlap_y1 - overlap_y0 <= 0) {
    return 0;
  } else {
    area_rect1 = item1.w * item1.h;
    area_rect2 = item2.w * item2.h;
    area_intersection = (overlap_x1 - overlap_x0) * (overlap_y1 - overlap_y0);
    area_union = area_rect1 + area_rect2 - area_intersection;
    return area_intersection / area_union;
  }
};

/* Velocity Vector*/
const computeVelocityVector = (item1, item2, nbFrame) => {
  return {
    dx: (item2.x - item1.x) / nbFrame,
    dy: (item2.y - item1.y) / nbFrame,
  };
};

const computeBearingIn360 = function (dx, dy) {
  var angle = Math.atan(dx / dy) / (Math.PI / 180);
  if (angle > 0) {
    if (dy > 0) return angle;
    else return 180 + angle;
  } else {
    if (dx > 0) return 180 + angle;
    else return 360 + angle;
  }
};

const iouDistance = function (item1, item2) {
  var iou = iouAreas(item1, item2);

  var distance = 1 - iou;

  if (distance > 1 - params.iouLimit) {
    distance = params.distanceLimit + 1;
  }

  return distance;
};

const params = {
  unMatchedFramesTolerance: 5,
  iouLimit: 0.05,
  fastDelete: true,
  distanceFunc: iouDistance,
  distanceLimit: 10000,
  matchingAlgorithm: "kdTree",
};

var mapOfItemsTracked = new Map();

var mapOfAllItemsTracked = new Map();

// Changed for memory efficiency and stack overflow prevention
var keepAllHistoryInMemory = false;

const updateTrackedItemsWithNewFrame = function (
  detectionsOfThisFrame,
  frameNb
) {
  var treeItemsTracked = new kdTree(
    Array.from(mapOfItemsTracked.values()),
    params.distanceFunc,
    ["x", "y", "w", "h"]
  );

  var treeDetectionsOfThisFrame = new kdTree(
    detectionsOfThisFrame,
    params.distanceFunc,
    ["x", "y", "w", "h"]
  );

  if (mapOfItemsTracked.size === 0) {
    detectionsOfThisFrame.forEach(function (itemDetected) {
      var newItemTracked = new ItemTracked(
        itemDetected,
        frameNb,
        params.unMatchedFramesTolerance,
        params.fastDelete
      );
      mapOfItemsTracked.set(newItemTracked.id, newItemTracked);
      treeItemsTracked.insert(newItemTracked);
    });
  } else {
    var matchedList = new Array(detectionsOfThisFrame.length);
    matchedList.fill(false);
    if (detectionsOfThisFrame.length > 0) {
      mapOfItemsTracked.forEach(function (itemTracked) {
        var predictedPosition = itemTracked.predictNextPosition();

        itemTracked.makeAvailable();

        var treeSearchResult = treeDetectionsOfThisFrame.nearest(
          predictedPosition,
          1,
          params.distanceLimit
        )[0];

        if (treeSearchResult) {
          var indexClosestNewDetectedItem = detectionsOfThisFrame.indexOf(
            treeSearchResult[0]
          );
          if (!matchedList[indexClosestNewDetectedItem]) {
            matchedList[indexClosestNewDetectedItem] = {
              idDisplay: itemTracked.idDisplay,
            };
            var updatedTrackedItemProperties =
              detectionsOfThisFrame[indexClosestNewDetectedItem];
            mapOfItemsTracked
              .get(itemTracked.id)
              .makeUnavailable()
              .update(updatedTrackedItemProperties, frameNb);
          } else {
          }
        }
      });
    } else {
      mapOfItemsTracked.forEach(function (itemTracked) {
        itemTracked.makeAvailable();
      });
    }

    if (mapOfItemsTracked.size > 0) {
      treeItemsTracked = new kdTree(
        Array.from(mapOfItemsTracked.values()),
        params.distanceFunc,
        ["x", "y", "w", "h"]
      );
      matchedList.forEach(function (matched, index) {
        if (!matched) {
          var treeSearchResult = treeItemsTracked.nearest(
            detectionsOfThisFrame[index],
            1,
            params.distanceLimit
          )[0];

          if (!treeSearchResult) {
            var newItemTracked = ItemTracked(
              detectionsOfThisFrame[index],
              frameNb,
              params.unMatchedFramesTolerance,
              params.fastDelete
            );
            mapOfItemsTracked.set(newItemTracked.id, newItemTracked);
            treeItemsTracked.insert(newItemTracked);
            newItemTracked.makeUnavailable();
          } else {
          }
        }
      });
    }

    mapOfItemsTracked.forEach(function (itemTracked) {
      if (itemTracked.available) {
        itemTracked.countDown(frameNb);
        itemTracked.updateTheoricalPositionAndSize();
        if (itemTracked.isDead()) {
          mapOfItemsTracked.delete(itemTracked.id);
          treeItemsTracked.remove(itemTracked);
          if (keepAllHistoryInMemory) {
            mapOfAllItemsTracked.set(itemTracked.id, itemTracked);
          }
        }
      }
    });
  }
};

const reset = function () {
  mapOfItemsTracked = new Map();
  mapOfAllItemsTracked = new Map();
  itemTrackedModule.reset();
};

const setParams = function (newParams) {
  Object.keys(newParams).forEach((key) => {
    params[key] = newParams[key];
  });
};

const enableKeepInMemory = function () {
  keepAllHistoryInMemory = true;
};

const disableKeepInMemory = function () {
  keepAllHistoryInMemory = false;
};

const getJSONOfTrackedItems = function (roundInt = true) {
  return Array.from(mapOfItemsTracked.values()).map(function (itemTracked) {
    return itemTracked.toJSON(roundInt);
  });
};

const getAllTrackedItems = function () {
  return mapOfAllItemsTracked;
};

const getJSONOfAllTrackedItems = function () {
  return Array.from(mapOfAllItemsTracked.values()).map(function (itemTracked) {
    return itemTracked.toJSONGenericInfo();
  });
};

const ITEM_HISTORY_MAX_LENGTH = 10;

var idDisplay = 0;

const ItemTracked = function (
  properties,
  frameNb,
  unMatchedFramesTolerance,
  fastDelete
) {
  var DEFAULT_UNMATCHEDFRAMES_TOLERANCE = unMatchedFramesTolerance;
  var itemTracked = {};
  itemTracked.available = true;
  itemTracked.delete = false;
  itemTracked.fastDelete = fastDelete;
  itemTracked.frameUnmatchedLeftBeforeDying = unMatchedFramesTolerance;
  itemTracked.isZombie = false;
  itemTracked.appearFrame = frameNb;
  itemTracked.disappearFrame = null;
  itemTracked.disappearArea = {};
  itemTracked.nameCount = {};
  itemTracked.nameCount[properties.name] = 1;
  itemTracked.x = properties.x;
  itemTracked.y = properties.y;
  itemTracked.w = properties.w;
  itemTracked.h = properties.h;
  itemTracked.name = properties.name;
  itemTracked.confidence = properties.confidence;
  itemTracked.itemHistory = [];
  itemTracked.itemHistory.push({
    x: properties.x,
    y: properties.y,
    w: properties.w,
    h: properties.h,
    confidence: properties.confidence,
  });
  if (itemTracked.itemHistory.length >= ITEM_HISTORY_MAX_LENGTH) {
    itemTracked.itemHistory.shift();
  }
  itemTracked.velocity = {
    dx: 0,
    dy: 0,
  };
  itemTracked.nbTimeMatched = 1;
  itemTracked.id = Math.random().toString(36).substr(2, 9);
  itemTracked.idDisplay = idDisplay;
  idDisplay++;
  itemTracked.update = function (properties, frameNb) {
    if (this.disappearFrame) {
      this.disappearFrame = null;
      this.disappearArea = {};
    }
    this.isZombie = false;
    this.nbTimeMatched += 1;
    this.x = properties.x;
    this.y = properties.y;
    this.w = properties.w;
    this.h = properties.h;
    this.confidence = properties.confidence;
    this.itemHistory.push({
      x: this.x,
      y: this.y,
      w: this.w,
      h: this.h,
      confidence: this.confidence,
    });
    if (itemTracked.itemHistory.length >= ITEM_HISTORY_MAX_LENGTH) {
      itemTracked.itemHistory.shift();
    }
    this.name = properties.name;
    if (this.nameCount[properties.name]) {
      this.nameCount[properties.name]++;
    } else {
      this.nameCount[properties.name] = 1;
    }
    this.frameUnmatchedLeftBeforeDying = DEFAULT_UNMATCHEDFRAMES_TOLERANCE;
    this.velocity = this.updateVelocityVector();
  };
  itemTracked.makeAvailable = function () {
    this.available = true;
    return this;
  };
  itemTracked.makeUnavailable = function () {
    this.available = false;
    return this;
  };
  itemTracked.countDown = function (frameNb) {
    if (this.disappearFrame === null) {
      this.disappearFrame = frameNb;
      this.disappearArea = {
        x: this.x,
        y: this.y,
        w: this.w,
        h: this.h,
      };
    }
    this.frameUnmatchedLeftBeforeDying--;
    this.isZombie = true;
    if (this.fastDelete && this.nbTimeMatched <= 1) {
      this.frameUnmatchedLeftBeforeDying = -1;
    }
  };
  itemTracked.updateTheoricalPositionAndSize = function () {
    this.itemHistory.push({
      x: this.x,
      y: this.y,
      w: this.w,
      h: this.h,
      confidence: this.confidence,
    });
    if (itemTracked.itemHistory.length >= ITEM_HISTORY_MAX_LENGTH) {
      itemTracked.itemHistory.shift();
    }
    this.x = this.x + this.velocity.dx;
    this.y = this.y + this.velocity.dy;
  };

  itemTracked.predictNextPosition = function () {
    return {
      x: this.x + this.velocity.dx,
      y: this.y + this.velocity.dy,
      w: this.w,
      h: this.h,
    };
  };

  itemTracked.isDead = function () {
    return this.frameUnmatchedLeftBeforeDying < 0;
  };
  itemTracked.updateVelocityVector = function () {
    if (ITEM_HISTORY_MAX_LENGTH <= 2) {
      return { dx: undefined, dy: undefined };
    }

    if (this.itemHistory.length <= ITEM_HISTORY_MAX_LENGTH) {
      const start = this.itemHistory[0];
      const end = this.itemHistory[this.itemHistory.length - 1];
      return computeVelocityVector(start, end, this.itemHistory.length);
    } else {
      const start =
        this.itemHistory[this.itemHistory.length - ITEM_HISTORY_MAX_LENGTH];
      const end = this.itemHistory[this.itemHistory.length - 1];
      return computeVelocityVector(start, end, ITEM_HISTORY_MAX_LENGTH);
    }
  };

  itemTracked.speed = function () {
    return Math.sqrt(
      Math.pow(this.velocity.dx, 2) + Math.pow(this.velocity.dy, 2)
    );
  };

  itemTracked.getMostlyMatchedName = function () {
    var nameMostlyMatchedOccurences = 0;
    var nameMostlyMatched = "";
    Object.keys(this.nameCount).map((name) => {
      if (this.nameCount[name] > nameMostlyMatchedOccurences) {
        nameMostlyMatched = name;
        nameMostlyMatchedOccurences = this.nameCount[name];
      }
    });
    return nameMostlyMatched;
  };

  itemTracked.toJSONDebug = function (roundInt = true) {
    return {
      id: this.id,
      idDisplay: this.idDisplay,
      x: roundInt ? parseInt(this.x, 10) : this.x,
      y: roundInt ? parseInt(this.y, 10) : this.y,
      w: roundInt ? parseInt(this.w, 10) : this.w,
      h: roundInt ? parseInt(this.h, 10) : this.h,
      confidence: Math.round(this.confidence * 100) / 100,
      bearing: parseInt(
        computeBearingIn360(this.velocity.dx, -this.velocity.dy)
      ),
      name: this.getMostlyMatchedName(),
      isZombie: this.isZombie,
      appearFrame: this.appearFrame,
      disappearFrame: this.disappearFrame,
    };
  };

  itemTracked.toJSON = function (roundInt = true) {
    return {
      id: this.idDisplay,
      x: roundInt ? parseInt(this.x, 10) : this.x,
      y: roundInt ? parseInt(this.y, 10) : this.y,
      w: roundInt ? parseInt(this.w, 10) : this.w,
      h: roundInt ? parseInt(this.h, 10) : this.h,
      confidence: Math.round(this.confidence * 100) / 100,
      bearing: parseInt(
        computeBearingIn360(this.velocity.dx, -this.velocity.dy),
        10
      ),
      name: this.getMostlyMatchedName(),
      isZombie: this.isZombie,
      speed: this.speed(),
    };
  };

  itemTracked.toMOT = function (frameIndex) {
    return `${frameIndex},${this.idDisplay},${this.x - this.w / 2},${
      this.y - this.h / 2
    },${this.w},${this.h},${this.confidence / 100},-1,-1,-1`;
  };

  itemTracked.toJSONGenericInfo = function () {
    return {
      id: this.id,
      idDisplay: this.idDisplay,
      appearFrame: this.appearFrame,
      disappearFrame: this.disappearFrame,
      disappearArea: this.disappearArea,
      nbActiveFrame: this.disappearFrame - this.appearFrame,
      name: this.getMostlyMatchedName(),
    };
  };
  return itemTracked;
};
