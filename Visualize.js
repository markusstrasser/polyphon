const Visualizer = class {
    constructor (canv, container) {
        this.canv = canv;
        this.canv.width = container.clientWidth; //works with reference?? outside of vis?
        this.canv.height = container.clientHeight;
        this.ctx = this.canv.getContext("2d");
//        this.offSetX = (this.canv.width/3); //default should be 0
        console.log(this.ctx);

        window.onresize = () => this.resizeMyDiv(this.canv); //or this
    }

    resizeMyDiv (canvas) { //or put the div in a flexbox??? well maybe horizontally bad
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
    }

    humanizeX (binIdx, arraySize, hzPerBin) {
        //if you're bin 50 you need 50 more bins to get to double frequency
        const midi = this.HzToMIDI(binIdx*hzPerBin);
//        const corrected = midi - this.HzToMIDI(startfromBin*hzPerBin);
        //use MIDI for logarithmic translation
        const heighestMidiforSegment = this.HzToMIDI(arraySize * hzPerBin); //it's still bin 500 ..even if arraysize is 420
        return midi / heighestMidiforSegment; //midi - startFromMidi;
    }
    yHeight (val, highestArrayVal) {
        return val / highestArrayVal;
    }

    midiToHz(midi) {
        let base = 8.1757989156; //Midi 0 according to internet
        let totalOctaves = 10; //from midi 0 to midi 120
        let multiplier = Math.pow(2, totalOctaves * midi / 120);
        let frequency = base * multiplier;
        return frequency;
    }


    drawRectangles (arr, hzPerBin, heighestVal, xOffset = 0, canv = this.canv, ctx = this.ctx) {
        let lastMidi = this.HzToMIDI(35*hzPerBin); //of startMiDi
        arr.forEach( (energy, bin) => {
            let myMidi = this.HzToMIDI(bin * hzPerBin);
        let binWidth = (myMidi - lastMidi) * 15; //the later the bin the smaller it gets
        lastMidi = myMidi;
        let binHeight = this.yHeight(energy, heighestVal);
        let xPos = xOffset + this.humanizeX(bin, arr.length, hzPerBin) * canv.width;
        let yPos = canv.height - binHeight* canv.height;

        ctx.fillRect(xPos - binWidth/2, yPos, binWidth , binHeight * canv.height);
    });

    }
    drawRectInfo (binData, canv=this.canv, ctx=this.ctx) {
        binData.forEach (function (bin) {
            let xPos = canv.width * bin.posX;
            let binHeight = canv.height * bin.energyRel;
            let yPos = canv.height * (1 -bin.energyRel);

            let binWidth = bin.width;
            ctx.fillStyle = bin.color;
            ctx.fillRect(xPos, yPos, binWidth, binHeight);
        });
    }

    drawTextwBackground(posX, posY, text, pitch = 6, rectSize = 60, context = this.ctx) {
        context.beginPath();

        if (posX < 10) {return};

        context.rect(posX-rectSize/2, posY-rectSize/2, rectSize, rectSize);//Apparently doing this doesn't work outside this function....
        context.font = "bold " + 30 + "px" + " Verdana";
        context.textAlign = "center";
        context.textBaseline = "middle";

        context.fillStyle = this.numberToHSLa(pitch, "75%", "60%", 0.8);
        context.fill();
        context.fillStyle = "white";
        context.fillText(text, posX, posY);
    }

    HzToMIDI(Hz) {
        if (Hz <= 0) {
            return -1;
        }
        const multipleOfBase = Hz / 8.1757989156; //8.17 is C0 which is MIDI 0 for standard tuning
        const midi = 12 * getBaseLog(2, multipleOfBase); //2 as base because = 1 octave

        if (midi < 0) {return -1}
        else return midi;


        function getBaseLog (x, y) { //returns the logarithm of y with base x (ie. logxy):
            return Math.log(y) / Math.log(x);
        }
    }

    numberToHSLa (midi, s = "100%", l = "60%", a = 1) { //HSL is more intuitive then RGB s=100, l =60;
        let num = midi;
        if (num > 12) {
            num = num % 12;
        }
        let h = 360 - (num * 360 / 12) + 60; //Hue goes gradually around (COUNTERCLOCK) the wheel at pitch '6' => 180deg
        if (h == 360) {h = 0;}
        return "hsla" + "(" + h + "," + s + "," + l + "," + a + ")";
    }

}