const Spectrum = class {
    constructor(callback = function () {
        // console.log("Your callback could be here")
    }) {

        //SETTING UP WEB AUDIO
        window.AudioContext = window.AudioContext || window.webkitAudioContext; //as of spring 2017...maybe need to add more prefixes later
        this.audioCtx = new window.AudioContext(); //TODO prefix add

        //Setup analyser
        this.analyserNode = this.audioCtx.createAnalyser(); //automatically creates and CONNECTS AnalyserNode to AudioSource
        this.analyserNode.fftSize = 16384; //default is 2048...for the tonedeaf...; HAS TO be multiple of 2
        this.analyserNode.minDecibels = -80;
        this.data = new Uint8Array(this.analyserNode.frequencyBinCount); //TODO: make UI option between 4 ArrayDataTypes

        this.BINCOUNT = 500; //covers until Midi 88
        this.THRESHOLD = 1; //minimal energy to be considered alive
        this.displayAbsolute = true;

        this.hzPerBin = this.audioCtx.sampleRate / this.analyserNode.fftSize; //the range every bin captures

        //Set the Data that doesn't change in the loop (most things except energy)
        this.spectrum = this.dataSetup(); //this [{}] can be extended for Xmappings and other features
        //GETTING MIC ACCESS
        navigator.getUserMedia = ( navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

        navigator.getUserMedia({audio: true}, (stream) => { //arrow function needed to make 'this...' work properly
            stream.onended = () => console.log('Stream ended');
            const source = this.audioCtx.createMediaStreamSource(stream);//set the stream to link to the AudioContext...it's strange I know
            source.connect(this.analyserNode); //this is working in the background...so might need to unplug somehow if performance is issue
            // console.log("STREAM: " + stream, "SOURCE: " + source)
            // console.log('started my Loop -PP');
            this.gotStream = true;
            callback(); //optional
        }, function (err) {
            alert ("Looks like you denied Microphone access or your browser blocked it. \nTo make it work: " +

                "\n\n>In 95% of cases: Click the green/secure bar or green lock icon left of the URL address bar (left of https://dacapo....)\n " +
                "\n\n If you can't see it: Check the -Settings- in your browser " +
                "\n\n>In CHROME it's | Settings => Content settings => Microphone| \n" +
                "\n>You can also try to reload the page and if nothing helps update your browser / delete your cookies \n" +
                "\n>If you are on Safari or Internet Explorer I lost all hopes for you \n" +
                "\n Good Luck!")
        });

        this.heighestEnergy;
        this.legitMidis = [];
        this.legitNotes = [];
    }

    updateBinCount (binCount) {
        this.BINCOUNT = binCount;
        this.spectrum = this.dataSetup();
    }

    dataSetup () {
        const seg = [];
        const pp = this; //reference inside obj

        for (let binNr = 0; binNr < this.BINCOUNT; binNr++) {
            const obj = {
                midi: pp.binToMidi(binNr),
                binNr: binNr,
                energyRel: 0.2, //default before first loop
                energyAbs: 1, //default
                hz: binNr * pp.hzPerBin
            };

            const midi = obj.midi;
            obj.color = pp.midiToHSLa(midi); //avoid NaN. obj values are not set in sequence weirdly
            obj.note = pp.midiToNoteName(midi);
            obj.noteDeluxe = pp.midiToNoteName(midi, "deluxe");

            seg.push(obj);
        }
        return seg;
    }
    //TICK TICK TICK ...every frame or whatever
    updateEnergyValues(mySpec) { //needs data which needs a stream which needs a audiocontext ladilalalala
        this.analyserNode.getByteFrequencyData(this.data); //TODO make this link to user choice

        this.segment = this.data.slice(0, this.BINCOUNT);
        //ATTENTION --> indexes might get mixed up if beginning isn't 0 //so .filter,.slice,.splice will cause bugs later on

        this.heighestEnergy = 0;
        this.mostEnergyBin = 0;
        for(let i = 0; i < this.segment.length; i++) {
            const binEnergy = this.segment[i]
            mySpec[i].energyAbs = binEnergy;

            if (binEnergy > this.heighestEnergy) { //update the chosen one
                this.heighestEnergy = binEnergy;
                this.mostEnergyBin = i;
            }
        }

        if (this.displayAbsolute) {
            this.heighestEnergy = 255;
        }

        mySpec.forEach((el) => el.energyRel = el.energyAbs / (this.heighestEnergy+0.001)); //to avoid NaN ( divide by 0.. )
//
// this.normalizedBinIdx = this.correctToLowestPeak(this.winBinIdx, this.segment); //independet from mySpec
    }

    binToMidi (bin) {
        if (Array.isArray(bin)) {
            throw new UserException('dont input array as argument');
        }
        return this.hzToMidi(bin * this.hzPerBin);
    }

    hzToMidi(Hz) {
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

    midiToHz(midi) {
        let base = 8.1757989156; //Midi 0 according to: "THE INTERNET"
        let totalOctaves = 10; //from midi 0 to midi 120
        let multiplier = Math.pow(2, totalOctaves *   midi / 120); //genius! forgot why
        let frequency = base * multiplier; // in HZ
        return frequency;
    }
    midiToBin(midi) {
        return this.midiToHz(midi) / this.hzPerBin;
    }

    midiToHSLa (midi, s = "100%", l = "60%", a = 1) { //HSL is more intuitive then RGB s=100, l =60;
        const segments = 12;
        midi = midi % segments;
        let h = 360 - (midi * 360 / segments) + 60; //Hue goes gradually around (COUNTERCLOCK) the wheel at pitch '6' => 180deg
        if (h == 360) {h = 0;}
        return "hsla" + "(" + h + "," + s + "," + l + "," + a + ")";
    }

    midiToNoteName(midi, which="none") {
        midi = Math.round(midi);
        const allNoteNames = [
            //    "C -2","C# -2","D -2","D# -2", "E -2","F -2","F# -2","G -2", "G# -2", "A -2", "A# -2", "B -2", //some note it differently
            "C -1","C# -1","D -1","D# -1", "E -1","F -1","F# -1","G -1", "G# -1", "A -1", "A# -1", "B -1",
            "C 0","C# 0","D 0","D# 0", "E 0","F 0","F# 0","G 0", "G# 0", "A 0", "A# 0", "B 0",
            "C 1","C# 1","D 1","D# 1", "E 1","F 1","F# 1","G 1", "G# 1", "A 1", "A# 1", "B 1",
            "C 2","C# 2","D 2","D# 2", "E 2","F 2","F# 2","G 2", "G# 2", "A 2", "A# 2", "B 2",
            "C 3","C# 3","D 3","D# 3", "E 3","F 3","F# 3","G 3", "G# 3", "A 3", "A# 3", "B 3",
            "C 4","C# 4","D 4","D# 4", "E 4","F 4","F# 4","G 4", "G# 4", "A 4", "A# 4", "B 4",
            "C 5","C# 5","D 5","D# 5", "E 5","F 5","F# 5","G 5", "G# 5", "A 5", "A# 5", "B 5",
            "C 6","C# 6","D 6","D# 6", "E 6","F 6","F# 6","G 6", "G# 6", "A 6", "A# 6", "B 6",
            "C 7","C# 7","D 7","D# 7", "E 7","F 7","F# 7","G 7", "G# 7", "A 7", "A# 7", "B 7",
            "C 8","C# 8","D 8","D# 8", "E 8","F 8","F# 8","G 8", "G# 8", "A 8", "A# 8", "B 8",
        ];
        const chromaticC3 = [ //could also produce allNoteNames from this with Midi knowledge
            "C",
            "C''",
            "D",
            "D''",
            "E",
            "F",
            "F''",
            "G",
            "G''",
            "A",
            "A''",
            "B",
            "C"
        ];
        return which === "deluxe" ? allNoteNames[midi] : chromaticC3[midi % 12];
    }
}
