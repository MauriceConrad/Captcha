Array.prototype.indexOfKey = function(value, key, start = 0) {
  for (var i = start; i < this.length; i++) {
    if (this[i][key] === value) {
      return i;
    }
  }
  return -1;
}
Array.prototype.itemByKey = function(value, key) {
  return this[this.indexOfKey(value, key, 0)];
};
