const ctx = document.getElementById('ctx').getContext('2d');
const SIZE = 32;
const LAYERS_COUNT = 25; // Why 25?
class Neron {
    constructor(x, y, v, w, nextLayer) {
        this.x = x; 
        this.y = y;        
        this.v = v;
        this.w = w;
        this.nextLayer = nextLayer;
    }
    activate() {
        if(this.v >= this.w) {
            this.v = 0;
            if (this.nextLayer) {
                this.nextLayer.forEach(n => n.activate());
            }
        } else {
            this.v += 1;
        }
    }
}
class Net {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        this.layers = [];
        let nextLayer;
        for (let i = LAYERS_COUNT - 1; i >= 0; i--) {
            const layer = this._createLayer(nextLayer);
            nextLayer = layer;
            this.layers[i] = layer;
        }
        this.input = this.layers[0];
    }
    _createLayer(nextLayer) {
        const layer = [];
        for(let x = 0; x < this.w; x ++) {
            for (let y = 0; y < this.h; y++) {
                const w = ~~(Math.random() * 5)
                layer.push(new Neron(x, y, 0, w, nextLayer));
            }
        }
        return layer;
    }
    activate() {
        //this.input.forEach(nin => nin.activate());
    }
    result(ox = 0, oy = 0) {
        const lastLayer = this.layers[this.layers.length - 1];
        return lastLayer.sort((a, b) => b.v - a.v).map(n => { return { x: ox + n.x, y: oy + n.y }; });
    }
}

class Field {
    constructor(w, h) {
        this.w = w;
        this.h = h;
        const savedItems = localStorage.getItem('items');
        if (savedItems) {
            this.items = JSON.parse(savedItems);
        } else {
            this.items = {};
        }
    }    
    getItem(x, y) {
        return this.items[`${x}-${y}`];
    }
    addItem(x, y, v) {
        const item = this.items[`${x}-${y}`] = {
            x, y, v
        };
        localStorage.setItem('items', JSON.stringify(this.items));
        return item;
    }
    render(ctx) {
        ctx.strokeStyle = '#abc';
        for(let x = 0; x < this.w; x ++) {
            for (let y = 0; y < this.h; y++) {
                ctx.strokeRect(x * SIZE, y * SIZE, SIZE, SIZE);
                ctx.fillStyle = '#0f0';
                ctx.font = SIZE / 3 + 'px monospace';
                //ctx.fillText(`${x}:${y}`, x * SIZE, y * SIZE + SIZE);
            }
        }
        ctx.fillStyle = '#f90';
        ctx.font = SIZE + 'px monospace';
        Object.values(this.items).forEach(item => {
            const w = ctx.measureText(item.v).width;
            ctx.fillText(item.v, item.x * SIZE + SIZE / 2 - w / 2, item.y * SIZE + SIZE / 1.25, SIZE);      
            if (item.isWin) {
                let mx, my, lx, ly;
                switch(item.dir) {
                    case 0: mx = 0; my = 0; lx = 1; ly = 1; break;
                    case 2: mx = 1; my = 0; lx = 0; ly = 1; break;
                    case 5: mx = 0; my = 1; lx = 1; ly = 0; break;
                    case 7: mx = 0; my = 0; lx = 1; ly = 1; break;
                    case 3: case 4: mx = 0.5; my = 0; lx = 0.5; ly = 1; break; // vertical
                    case 6: case 1: mx = 0; my = 0.5; lx = 1; ly = 0.5; break; // horizontal
                }
                ctx.beginPath();
                ctx.strokeStyle = '#000';
                ctx.moveTo(item.x * SIZE + mx * SIZE, item.y * SIZE + my * SIZE);
                ctx.lineTo(item.x * SIZE + lx * SIZE, item.y * SIZE + ly * SIZE);                
                ctx.stroke();
            }      
        });
    }
    check() {
        const chains = [];
        const checkItem = (item, chain, parentDir, countdown = 10) => {
            const ns = this.getNS(item).filter(n => n.item.v === item.v);
            ns.forEach(N => {
                const n = N.item;
                    if (chain) {
                        if (N.dir === parentDir) { 
                            chain.push(n); 
                            countdown > 0 && checkItem(n, chain, N.dir, countdown - 1);                        
                        }
                    } else {
                        const ch = [item, n];
                        ch.dir = N.dir;
                        chains.push(ch);
                        countdown > 0 && checkItem(n, ch, N.dir, countdown - 1); 
                    }                                                       
            });
        };
        Object.values(this.items).forEach(item => checkItem(item));
        chains.sort((a,b) => b.length - a.length);
        const winChain = chains[0];
        if (winChain && winChain.length >= 5) {
            winChain.forEach(item => {
                item.dir = winChain.dir;
                item.isWin = true;
            });
            if(!this.block) { 
                this.block = true;
                setTimeout(() => {
                    alert('Player ' + winChain[0].v + ' is win!');                    
                }, 0xff);
            }
        }
        this.chains = chains;
    }
    getN(item) {
        return [
            {x: -1, y: -1}, // 0 
            {x: -1, y:  0}, // 1 
            {x: -1, y:  1}, // 2
            {x:  0, y: -1}, // 3 
            {x:  0, y:  1}, // 4 
            {x:  1, y: -1}, // 5
            {x:  1, y:  0}, // 6 
            {x:  1, y:  1}, // 7 
        ].map((n, i) => { 
            return { x: n.x, y: n.y, dir: i, item: this.getItem(item.x + n.x, item.y + n.y)}
        });
    }
    getNS(item) {
        return this.getN(item).filter(n => !!n.item);
    }
}
class App {
    constructor(ctx) {
        this.ctx = ctx;
        this.ctx.canvas.addEventListener('click', this.click.bind(this));        
        this.AI = !!(Number(localStorage.getItem('AI')));      
        this.NN = !!(Number(localStorage.getItem('NN')));
        this.updateCheckboxes();
        this.init();
    }
    init() {        
        this.field = new Field(20, 15);
        this.nn = new Net(5, 5);
        this.currentPlayer = 'X'; // X, O
    }
    start() {
        const self = this;
        requestAnimationFrame(function loop() {
            self.render();
            requestAnimationFrame(loop);
        });
    }
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        this.field.render(ctx);
    }
    addItem(x, y) {
        const item = this.field.addItem(x, y, this.currentPlayer);
        this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
        return item;
    }
    click(e) {
        if (this.field.block) return;
        const x = ~~(e.offsetX / SIZE);
        const y = ~~(e.offsetY / SIZE);
        const item = this.field.getItem(x, y);
        if (!item) {
            const currentMove = this.addItem(x, y);
            this.field.check();
            if (this.AI && !this.field.block) {
                const nextMove = this.suggestNextMove(currentMove);
                if (!nextMove) throw new Error('Next move is undefiend or null!');
                this.addItem(nextMove.x, nextMove.y);
                this.field.check();
            }
        }
    }
    opositeDir(dir) {
        switch(dir) {
            case 3: return 4;
            case 4: return 3;
            case 0: return 7;
            case 7: return 0;
            case 1: return 6;
            case 6: return 1;
            case 5: return 2;
            case 2: return 5;
        }
    }
    suggestNextMove(currentMove) {
        if (this.NN) {
            this.nn.input.forEach(nin => {
                const item = this.field.getItem(currentMove.x + nin.x, currentMove.y + nin.y);
                if (item) {
                    nin.v = item.v == 'X' ? -1 : 1;
                }
            });
            this.nn.activate();
            const result = this.nn.result(currentMove.x, currentMove.y);
            console.log(result);
            return result[0];
        }
        
        const n = this.field.getN(currentMove);
        let stop = false;
        const nextMove = (function search(n, countdown = 10) {
            if (stop) return;
            let result;
            const freeN = n.filter(n => !n.item);
            if (freeN.length) {
                const chains = this.field.chains.filter(chain => chain.includes(currentMove))
                if (chains && chains.length >= 3) {
                    const desiredDir = chains[0].dir;
                    const opositeDesireDir = this.opositeDir(desiredDir);
                    const nextN = freeN.find(N => N.dir == desiredDir || N.dir == opositeDesireDir);
                    if (nextN) {                        
                        result = { x: currentMove.x + nextN.x, y: currentMove.y + nextN.y };
                        stop = true;  
                    }
                } else {
                    //const nextItem = { x: currentMove.x + freeN[0].x, y: currentMove.y + freeN[0].y };
                    //nextMove = { nx: nextItem.x, ny: nextItem.y };
                    //stop = true;    
                }
            } else {
                const possibleMoves = n.map(N => N.item ? countdown > 0 && search.call(this, this.field.getN(N.item), countdown - 1) : null).filter(pm => !!pm);
                result = this.AIMove() || possibleMoves[0];
            }    
            return result || this.randomMove(currentMove);
        }).call(this, n);
        console.log('Next move', nextMove);
        return nextMove;
    }
    AIMove() {
        const aiChains = this.field.chains.filter(chain => chain[0].v == 'O');
        const chains = aiChains.sort((a, b) => b.length - a.length); 
        let nextMove;
        if (chains && chains.length) {
            chains.some(chain => {
                const nextInChain = this.nextInChain(chain);
                if (nextInChain && nextInChain.length) {
                    nextMove = nextInChain[~~(Math.random()*nextInChain.length)];
                    console.log('AIMove');
                    return true;
                }
            })
        }
        return nextMove;
    }
    nextInChain(chain) {
        let next = [];
        const first = chain[0];
        const last = chain[chain.length - 1];
        switch(chain.dir) {
            case 0: 
                next = [
                    { x: first.x - 1, y: first.y - 1}, 
                    { x: last.x  - 1, y: last.y  - 1}
                ];
            break;
            case 1: 
                next = [
                    { x: first.x - 1, y : first.y}, 
                    { x: last.x  - 1, y : last.y }
                ];
            break;
        }
        return next.filter(n => !this.field.getItem(n.x, n.y));
    }
    randomMove(currentMove) {
        while(true) {
            const nextMove = { x: currentMove.x + ~~(Math.random() * 5), y:  currentMove.y + ~~(Math.random() * 5)};
            if (!this.field.getItem(nextMove.x, nextMove.y)) {
                console.log('Random nextMove');
                return nextMove;
            }
        }
    }
    clear() {
        this.field.block = false;
        this.field.items = {};
        this.currentPlayer = 'X';
        localStorage.removeItem('items');
    }
    toggleAI() {
        this.field.block = false;
        this.AI = !this.AI;
        //if (this.AI) this.NN = false; 
        localStorage.setItem('AI', Number(!!this.AI));
        localStorage.setItem('NN', Number(!!this.NN));
        this.clear();
        this.init();
        setTimeout(() => this.updateCheckboxes(), 0);
    }
    toggleNN() {
        this.field.block = false;
        this.NN = !this.NN;
        //if (this.NN) this.AI = false; 
        localStorage.setItem('AI', Number(!!this.AI));
        localStorage.setItem('NN', Number(!!this.NN));
        this.clear();
        this.init();
        setTimeout(() => this.updateCheckboxes(), 0);
    }
    updateCheckboxes() {
        const aiEl = document.getElementById('ai');
        const nnEl = document.getElementById('nn');
        if (this.AI) aiEl.setAttribute('checked', 'checked');
        else aiEl.removeAttribute('checked');
        if (this.NN) nnEl.setAttribute('checked', 'checked');
        else this.NN && nnEl.removeAttribute('checked');
    }
}
const app = new App(ctx);
app.start();
app.field.check();