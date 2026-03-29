export class WeaponSystem {
  constructor() {
    this.modes = [
      { id: 'standard', name: 'Prime Blaster', description: 'One-shots primes' },
      { id: 'factor', name: 'Factor Cannon', description: 'Fire factor rounds 2, 3, 5, 7' },
      { id: 'gcd', name: 'GCD Pulse', description: 'Break the boss shield with the correct gcd alignment' },
    ];

    this.activeIndex = 0;
    this.factorValues = [2, 3, 5, 7];
    this.gcdValues = [2, 3, 4, 6, 9, 12];
    this.factorIndex = 0;
    this.gcdIndex = 0;
    this.cooldownUntil = 0;
  }

  reset() {
    this.activeIndex = 0;
    this.factorIndex = 0;
    this.gcdIndex = 0;
    this.cooldownUntil = 0;
  }

  handleKey(code) {
    if (code === 'Digit1') {
      this.activeIndex = 0;
      return this.getSelectionSummary('1');
    }

    if (code === 'Digit2') {
      this.activeIndex = 1;
      return this.getSelectionSummary('2');
    }

    if (code === 'Digit3') {
      this.activeIndex = 2;
      return this.getSelectionSummary('3');
    }

    if (code === 'KeyQ') {
      this.cycleValue(-1);
      return this.getSelectionSummary('Q');
    }

    if (code === 'KeyE') {
      this.cycleValue(1);
      return this.getSelectionSummary('E');
    }

    return null;
  }

  cycleValue(direction) {
    if (this.mode.id === 'factor') {
      const count = this.factorValues.length;
      this.factorIndex = (this.factorIndex + direction + count) % count;
    }

    if (this.mode.id === 'gcd') {
      const count = this.gcdValues.length;
      this.gcdIndex = (this.gcdIndex + direction + count) % count;
    }
  }

  tryFire() {
    const now = performance.now();

    if (now < this.cooldownUntil) {
      return false;
    }

    this.cooldownUntil = now + 240;
    return true;
  }

  getCycleHint() {
    if (this.mode.id === 'standard') {
      return 'Prime shot';
    }

    if (this.mode.id === 'factor') {
      return `Bullet ${this.value}`;
    }

    return `Pulse ${this.value}`;
  }

  get mode() {
    return this.modes[this.activeIndex];
  }

  get value() {
    if (this.mode.id === 'factor') {
      return this.factorValues[this.factorIndex];
    }

    if (this.mode.id === 'gcd') {
      return this.gcdValues[this.gcdIndex];
    }

    return null;
  }

  getDisplayName() {
    if (this.mode.id === 'factor') {
      return `${this.mode.name} [${this.value}]`;
    }

    if (this.mode.id === 'gcd') {
      return `${this.mode.name} [${this.value}]`;
    }

    return this.mode.name;
  }

  getSelectionSummary(triggerKey = '') {
    if (this.mode.id === 'standard') {
      return {
        triggerKey,
        title: 'Key 1 Selected',
        label: 'Prime Blaster',
        detail: 'Shoots the prime-only weapon',
      };
    }

    if (this.mode.id === 'factor') {
      return {
        triggerKey,
        title: `Key ${triggerKey || '2'} Selected`,
        label: `Factor Cannon [${this.value}]`,
        detail: `Current bullet is ${this.value}`,
      };
    }

    return {
      triggerKey,
      title: `Key ${triggerKey || '3'} Selected`,
      label: `GCD Pulse [${this.value}]`,
      detail: `Current pulse value is ${this.value}`,
    };
  }
}
