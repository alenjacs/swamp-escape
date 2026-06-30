export class Hud {
  constructor() {
    this.el = document.getElementById('hud');
  }

  getHealthBarColor(current, max) {
    const ratio = max > 0 ? current / max : 0;

    if (ratio > 0.6) return '#22c55e';
    if (ratio > 0.3) return '#eab308';
    return '#ef4444';
  }

  update({
    health = 100,
    maxHealth = 100,
    state = 'Running',
    objective = 'Reach the orange tile.'
  } = {}) {
    if (!this.el) return;

    const current = Math.max(0, Math.round(health));
    const max = Math.max(1, Math.round(maxHealth));
    const percent = Math.max(0, Math.min(100, (current / max) * 100));
    const barColor = this.getHealthBarColor(current, max);
    const goalOrange = '#ff8c00';

    let statusHtml = `Status: ${state}`;
    let objectiveHtml = `${objective}`;

    if (state === 'Running') {
      statusHtml = `Status: <span style="color:#22c55e;">Alive</span>`;
    } else if (state === 'Stunned') {
      statusHtml = `Status: <span style="color:#eab308;">Stunned</span>`;
    } else if (state === 'Dead') {
      statusHtml = `Status: <span style="color:#ef4444;">Dead</span>`;
      objectiveHtml = `You are <span style="color:#ef4444;">dead</span>. Press R to restart.`;
    } else if (state === 'Escaped') {
      statusHtml = `Status: <span style="color:#22c55e;">Escaped</span>`;
      objectiveHtml = `You escaped. Press R to restart.`;
    }

    objectiveHtml = objectiveHtml.replace(
      'orange',
      `<span style="color:${goalOrange};">orange</span>`
    );

    this.el.innerHTML = `
      <div style="
        position: fixed;
        top: 72px;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-family: 'Minecraft', Arial, sans-serif;
        font-size: 52px;
        letter-spacing: 2px;
        text-shadow:
          0 3px 0 rgba(0,0,0,0.35),
          0 0 10px rgba(0,0,0,0.18);
        white-space: nowrap;
        text-align: center;
      ">
        Swamp Escape
      </div>

      <div style="
        position: fixed;
        top: 12px;
        left: 12px;
        background: rgba(50, 50, 50, 0.55);
        padding: 10px 12px;
        border-radius: 10px;
        color: white;
        font-family: 'Minecraft', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        min-width: 300px;
        box-sizing: border-box;
      ">
        ${statusHtml}<br>
        ${objectiveHtml}
        <div style="margin-top: 6px; opacity: 0.95;">WASD move | Shift sprint | R restart</div>
      </div>

      <div style="
        position: fixed;
        left: 12px;
        bottom: 12px;
        background: rgba(50, 50, 50, 0.55);
        padding: 10px 12px;
        border-radius: 10px;
        color: white;
        font-family: 'Minecraft', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.6;
        min-width: 260px;
        box-sizing: border-box;
      ">
        <div style="
          margin-bottom: 6px;
          font-size: 15px;
        ">
          Health
        </div>

        <div style="
          width: 220px;
          height: 16px;
          background: rgba(255,255,255,0.12);
          border: 3px solid rgba(255,255,255,0.75);
          box-sizing: border-box;
          overflow: hidden;
        ">
          <div style="
            width: ${percent}%;
            height: 100%;
            background: ${barColor};
            transition: width 0.15s ease;
          "></div>
        </div>

        <div style="
          margin-top: 6px;
          font-size: 14px;
          color: white;
        ">
          ${current}/${max}
        </div>
      </div>
    `;
  }
}