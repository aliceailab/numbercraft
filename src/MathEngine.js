export class MathEngine {
  static isPrime(value) {
    const n = Math.floor(Math.abs(value));

    if (n < 2) {
      return false;
    }

    if (n === 2) {
      return true;
    }

    if (n % 2 === 0) {
      return false;
    }

    for (let i = 3; i * i <= n; i += 2) {
      if (n % i === 0) {
        return false;
      }
    }

    return true;
  }

  static factorize(value) {
    const factors = [];
    let n = Math.floor(Math.abs(value));

    if (n < 2) {
      return factors;
    }

    while (n % 2 === 0) {
      factors.push(2);
      n /= 2;
    }

    for (let i = 3; i * i <= n; i += 2) {
      while (n % i === 0) {
        factors.push(i);
        n /= i;
      }
    }

    if (n > 1) {
      factors.push(n);
    }

    return factors;
  }

  static phi(value) {
    const n = Math.floor(Math.abs(value));

    if (n <= 0) {
      return 0;
    }

    if (n === 1) {
      return 1;
    }

    let result = n;
    let remaining = n;

    for (let p = 2; p * p <= remaining; p += 1) {
      if (remaining % p !== 0) {
        continue;
      }

      while (remaining % p === 0) {
        remaining /= p;
      }

      result -= result / p;
    }

    if (remaining > 1) {
      result -= result / remaining;
    }

    return Math.floor(result);
  }

  static gcd(a, b) {
    let x = Math.abs(Math.floor(a));
    let y = Math.abs(Math.floor(b));

    while (y !== 0) {
      const temp = y;
      y = x % y;
      x = temp;
    }

    return x;
  }

  static lcm(a, b) {
    if (a === 0 || b === 0) {
      return 0;
    }

    return Math.abs(a * b) / this.gcd(a, b);
  }

  static lcmOf(values) {
    return values.reduce((accumulator, value) => this.lcm(accumulator, value), 1);
  }

  static getZoneRuleText(zone) {
    return 'No zone restrictions';
  }

  static zoneAllowsValue(zone, value) {
    return true;
  }

  static describeEnemy(enemy) {
    if (enemy.kind === 'boss') {
      if (!enemy.shieldBroken) {
        return `Boss ${enemy.number} | gcd target ${enemy.gcdTarget} | shield ${enemy.shieldHits}/${enemy.requiredShieldHits}`;
      }

      return `Boss ${enemy.number} | lcm sync ${this.lcmOf(enemy.coreFactorsApplied)}/${enemy.lcmTarget}`;
    }

    const currentValue = enemy.remaining ?? enemy.number;

    if (this.isPrime(enemy.number)) {
      return `Prime enemy ${enemy.number}`;
    }

    if (this.isPrime(currentValue)) {
      return `Composite ${enemy.number} | prime core remaining ${currentValue}`;
    }

    const factors = this.factorize(enemy.number).join(' x ');
    return `Composite ${enemy.number} = ${factors} | core ${enemy.remaining}`;
  }

  static evaluateStandardShot(enemy, zone) {
    if (enemy.kind === 'boss') {
      return { ok: false, message: 'Boss armor ignores standard rounds' };
    }

    const currentValue = enemy.remaining ?? enemy.number;

    if (!this.isPrime(currentValue)) {
      return { ok: false, message: 'Composite target detected. Use factor bullets.' };
    }

    return {
      ok: true,
      defeated: true,
      message: currentValue === enemy.number
        ? `Prime ${enemy.number} vaporized`
        : `Prime core ${currentValue} shattered inside ${enemy.number}`,
    };
  }

  static evaluateFactorShot(enemy, factor, zone, buffs) {
    if (enemy.kind === 'boss') {
      if (!enemy.shieldBroken) {
        return { ok: false, message: 'Boss shield is still up. Use the GCD pulse.' };
      }

      if (enemy.lcmTarget % factor !== 0) {
        return { ok: false, message: `${factor} cannot participate in the target LCM` };
      }

      const nextFactors = new Set(enemy.coreFactorsApplied);
      nextFactors.add(factor);
      const syncValue = this.lcmOf([...nextFactors]);

      if (enemy.lcmTarget % syncValue !== 0) {
        return { ok: false, message: `LCM(${[...nextFactors].join(', ')}) overshoots the core target` };
      }

      return {
        ok: true,
        message: syncValue === enemy.lcmTarget
          ? `LCM synchronized at ${enemy.lcmTarget}. Boss core collapsed`
          : `LCM sync now ${syncValue}. Reach ${enemy.lcmTarget}`,
        newBossFactors: [...nextFactors],
        defeated: syncValue === enemy.lcmTarget,
      };
    }

    if (this.isPrime(enemy.number)) {
      return { ok: false, message: 'Prime targets reject factor rounds' };
    }

    if (enemy.remaining % factor !== 0) {
      return { ok: false, message: `${factor} is not a valid factor of ${enemy.remaining}` };
    }

    const dividedValue = enemy.remaining / factor;
    let nextRemaining = dividedValue;
    let totientApplied = false;

    if (buffs.totientActive && nextRemaining > 1) {
      nextRemaining = this.phi(nextRemaining);
      totientApplied = true;
    }

    return {
      ok: true,
      remaining: nextRemaining,
      defeated: nextRemaining === 1,
      totientApplied,
      dividedValue,
      message: nextRemaining === 1
        ? `${enemy.number} fully factorized`
        : totientApplied
          ? `Valid factor. Totient changed the core from ${dividedValue} to ${nextRemaining}.`
          : `Valid factor. Core: ${nextRemaining}`,
    };
  }

  static evaluateGcdShot(enemy, gcdValue) {
    if (enemy.kind !== 'boss') {
      return { ok: false, message: 'GCD pulse is mainly for the boss shield' };
    }

    if (enemy.shieldBroken) {
      return { ok: false, message: 'Shield broken. Switch to factor bullets.' };
    }

    const overlap = this.gcd(gcdValue, enemy.number);

    if (overlap !== enemy.gcdTarget) {
      return {
        ok: false,
        message: `gcd(${gcdValue}, ${enemy.number}) = ${overlap}, need ${enemy.gcdTarget}`,
      };
    }

    return {
      ok: true,
      shieldHits: enemy.shieldHits + 1,
      shieldBroken: enemy.shieldHits + 1 >= enemy.requiredShieldHits,
      message: enemy.shieldHits + 1 >= enemy.requiredShieldHits
        ? `gcd aligned at ${enemy.gcdTarget}. Shield shattered`
        : `gcd aligned at ${enemy.gcdTarget}. Shield hits ${enemy.shieldHits + 1}/${enemy.requiredShieldHits}`,
    };
  }

  static fermatScan(enemy) {
    const isPrime = this.isPrime(enemy.number);
    const factors = isPrime ? [enemy.number] : this.factorize(enemy.number);

    return {
      isPrime,
      message: isPrime
        ? `${enemy.number} passes the Fermat scan: prime`
        : `${enemy.number} is composite: ${factors.join(' x ')}`,
    };
  }
}
