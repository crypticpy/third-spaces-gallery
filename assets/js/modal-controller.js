/**
 * ModalController -- shared modal lifecycle utility
 * Handles: open/close, focus trap, Escape key, backdrop click, history.pushState
 * Usage: var modal = new TSGModal(element, { onClose: fn })
 * Exposed as window.TSGModal
 */
(function () {
  "use strict";

  function ModalController(el, options) {
    if (!el) return;
    this.el = el;
    this.options = options || {};
    this.previousFocus = null;
    this._focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    this._boundEscape = this._handleEscape.bind(this);
    this._boundBackdrop = this._handleBackdrop.bind(this);
    this._boundPopstate = this._handlePopstate.bind(this);
    this._closingViaPopstate = false;
    this._trapCleanup = null;
  }

  ModalController.prototype.open = function () {
    if (this.isOpen()) return;
    this.previousFocus = document.activeElement;
    this.el.classList.remove("hidden");
    this.el.classList.add("flex");
    document.body.classList.add("overflow-hidden");

    // Focus first focusable element
    var focusable = this.el.querySelector(this._focusableSelector);
    if (focusable) focusable.focus();

    // Trap focus
    this._trapFocus();

    // History state for mobile back button
    history.pushState({ modal: true, source: "tsg-modal" }, "");

    // Event listeners
    document.addEventListener("keydown", this._boundEscape);
    this.el.addEventListener("click", this._boundBackdrop);
    window.addEventListener("popstate", this._boundPopstate);
  };

  ModalController.prototype.close = function () {
    if (!this.isOpen()) return;

    // Release focus trap
    this._releaseFocusTrap();

    this.el.classList.add("hidden");
    this.el.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");

    // Remove event listeners
    document.removeEventListener("keydown", this._boundEscape);
    this.el.removeEventListener("click", this._boundBackdrop);
    window.removeEventListener("popstate", this._boundPopstate);

    // Restore focus
    if (this.previousFocus && typeof this.previousFocus.focus === "function") {
      this.previousFocus.focus();
      this.previousFocus = null;
    }

    // Navigate back (unless we're closing due to popstate)
    if (!this._closingViaPopstate) {
      history.back();
    }

    // Callback
    if (this.options.onClose) this.options.onClose();
  };

  ModalController.prototype.isOpen = function () {
    return this.el && !this.el.classList.contains("hidden");
  };

  ModalController.prototype._handleEscape = function (e) {
    if (e.key === "Escape") {
      e.preventDefault();
      this.close();
    }
  };

  ModalController.prototype._handleBackdrop = function (e) {
    // Only close if clicking directly on the overlay, not on the panel
    if (
      e.target === this.el ||
      e.target.hasAttribute("data-ql-backdrop") ||
      e.target.hasAttribute("data-modal-backdrop")
    ) {
      this.close();
    }
  };

  ModalController.prototype._handlePopstate = function () {
    if (!this.isOpen()) return;
    this._closingViaPopstate = true;
    this.close();
    this._closingViaPopstate = false;
  };

  ModalController.prototype._trapFocus = function () {
    var self = this;
    this._trapCleanup = function (e) {
      if (e.key !== "Tab") return;
      var focusable = Array.from(
        self.el.querySelectorAll(self._focusableSelector),
      );
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", this._trapCleanup);
  };

  ModalController.prototype._releaseFocusTrap = function () {
    if (this._trapCleanup) {
      document.removeEventListener("keydown", this._trapCleanup);
      this._trapCleanup = null;
    }
  };

  ModalController.prototype.destroy = function () {
    this.close();
    document.removeEventListener("keydown", this._boundEscape);
    this.el.removeEventListener("click", this._boundBackdrop);
    window.removeEventListener("popstate", this._boundPopstate);
    this._releaseFocusTrap();
  };

  window.TSGModal = ModalController;
})();
