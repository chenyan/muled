class PPTXViewer {
  constructor() {
    this._slideCount = 0;
    this._slideIndex = 0;
  }

  loadFile() {
    return Promise.resolve(this);
  }

  render() {
    return Promise.resolve(this);
  }

  nextSlide() {
    return Promise.resolve(this);
  }

  previousSlide() {
    return Promise.resolve(this);
  }

  goToSlide() {
    return Promise.resolve(this);
  }

  getSlideCount() {
    return this._slideCount;
  }

  getCurrentSlideIndex() {
    return this._slideIndex;
  }

  setCanvas() {
    return this;
  }

  on() {}

  off() {}

  destroy() {}
}

module.exports = { PPTXViewer };
