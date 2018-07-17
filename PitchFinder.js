
const PitchFinder = class {
  constructor () {
  }

  findPolyPhonic(binData, legitEnergy = 0.2) {

        const allBins = binData.slice();
        let topBins = [];
        allBins.forEach ( (bin) => {
            if (bin.energyRel > legitEnergy) {
                topBins.push(bin.binNr);
            };
        });

        topBins = Array.from(new Set(topBins));
        topBins.sort((a,b) => a - b);



        let reducedBins2D = this.clusterNeighbors(topBins); //rename function name [1,2,5,6,15,16] => [ [1,2], [5,6], [15,16] ];
        //use clusterbyMidis for audio stuff -- not really related to what we hear but actual phys. sound
        let winnerBins;
        if (!reducedBins2D) {
            return;
        }
        if (reducedBins2D[0].length) { //sign of life
            winnerBins = reducedBins2D
                .map(function winnerInGroup(array) {
                    // ---- TEST best reduction here. Might be just biggest, might be interpolation or average of neighbors
                    return array
                        .reduce(function (biggest, binNr) { //dangerous reducing going on here. From neighborgroup reference to data and find heighest
                                if (allBins[binNr].energyAbs >= allBins[biggest].energyAbs) {
                                    biggest = binNr;
                                }
                                return biggest
                            },
                            array[0]); //by default take first neighbor. end of reduce
                }); //end of map
        }
        //

      let top = winnerBins || [];
      winnerBins = winnerBins || [];

        // winnerBins = winnerBins.map( binIdx => this.correctToLowestPeak(binIdx, PP.segment));

        //
        this.myTopBins = top; //just for debugging


        let topMidisRound = top.map(bin => Math.round(allBins[bin].midi));
        topMidisRound = Array.from(new Set(topMidisRound));

      let endRange = topMidisRound[0] + 23; //2 Octaves w/o itself (FAC ==> every note played should have same count)

      topMidisRound = this.clipMidis(topMidisRound, topMidisRound[0], endRange);
      this.topMidis = topMidisRound;

      const maxCount = this.findNoteCountMax(topMidisRound);
      const midisPerNote2D = this.groupMidisbyNote2D(topMidisRound);

      //here you can check for other than maxCount and combine
      const noteGuesses = this.notesWithCountX(midisPerNote2D, maxCount);

      this.displayMidis = topMidisRound
              .filter(midi => noteGuesses.includes(midi % 12) &&
          !(topMidisRound.includes(midi -12) || topMidisRound.includes(midi -24)));


        //filter for noteGuesses and flatten

        this.legitNotes = noteGuesses;
        this.legitMidis = this.displayMidis;

    }

    clipMidis (midis, start, end) {
      return midis.filter( midi => midi >= start && midi <= end);
    }

    findNoteCountMax (midis) {
        let maxCount = 0;
        for (let noteChrom = 0; noteChrom <= 11; noteChrom++) {
            let count = midis
                    .filter(midi => midi % 12 === noteChrom).length;
            if ( count > maxCount ) {
                maxCount = count;
            }
        }
        return maxCount;
    }

    groupMidisbyNote2D (midis) {
        let noteMidis = [];
        for (let noteChrom = 0; noteChrom <= 11; noteChrom++) {

            noteMidis
                .push(midis
                        .filter(midi => (midi % 12) === noteChrom));

        }
        return noteMidis;
    }

    notesWithCountX (midis2D, count) {
        if (!count) return [];

        let notes = [];

        midis2D.forEach((midis, idx) =>
        {
            if (midis.length === count) {
                notes.push(midis[0] % 12); //since every midi in the inner array is same note
            }
        });
        notes =notes.sort((a,b) => a - b);
        return notes;
    }

    isOctaveTooHigh (binIdx, binData, legit = 1/15) { //shit workaround code here
        const imagOct = binIdx / 2;
        const legitVal = 220 * legit;
        const oct3 = binData[imagOct*3];
        const oct5 = binData[imagOct*5];
        const oct7 = binData[imagOct*7];

        if (!oct3 || !oct5 || !oct7) {
            return false;
        }
        else if (oct3.energyAbs > legitVal &&
            oct5.energyAbs > legitVal &&
            oct7.energyAbs > legitVal)
        {
            return true;
        }
        return false;
    }

    clusterBinsByMidi (bins = [[-1]], binData) {
        if (!bins.length || !binData.length) {
            return;
        }
        bins = bins.slice();
        let prevMidi = Math.round(binData[bins[0]].midi);
        let reducedBins = [[]]; //will be 2D array
        let group = 0; //pushes new values to current group
        for (let i = 0; i < bins.length; i++) {
            let myMidi = Math.round(binData[bins[i]].midi);
            if (prevMidi == myMidi) { //should work w/o Math.abs
                reducedBins[group].push(bins[i]); //new value in group
            } else {
                reducedBins.push([bins[i]]); //new array with value inside reducedBins
                group++;
            }
            prevMidi = myMidi;
        }
        return reducedBins;
    }

    clusterNeighbors(bins) {
        let reducedBins = [[]]; //will be 2D array
        let prev = bins[0];
        let group = 0; //pushes new values to current group
        for (let i = 0; i < bins.length; i++) {
            if ( Math.abs(bins[i] - prev) < 2) { //should work w/o Math.abs
                reducedBins[group].push(bins[i]); //new value in group
            } else {
                reducedBins.push([bins[i]]); //new array with value inside reducedBins
                group++;
            }
            prev = bins[i];
        }
        return reducedBins;
    }

    correctToLowestPeak(biggestIdx, spectrumData) { //divide neighbors as well and search...
        var newIdx = biggestIdx; //by default
        for (var divisor = 6; divisor >= 2; divisor-= 1) {

            var smallerIdx = Math.round(biggestIdx / divisor); //had problems bc I didn't use .round and JS didn't throw errorMsg
            var ratio = this.heighestEnergy / spectrumData[smallerIdx];
            if (ratio > 0.3 && ratio < 8) //if energies are close together...
            {
                //---check neighbors to be sure
                if (spectrumData[smallerIdx] > spectrumData[smallerIdx + 1]) { //compares neighors energy values
                    newIdx = smallerIdx;
                }
                if (spectrumData[smallerIdx + 1] > spectrumData[smallerIdx]) {
                    newIdx = smallerIdx + 1;
                }
                if (spectrumData[smallerIdx - 1] > spectrumData[smallerIdx]) { //
                    newIdx = smallerIdx - 1;
                }
                if (spectrumData[smallerIdx - 2] > spectrumData[smallerIdx]) { //
                    newIdx = smallerIdx - 2;
                }
            }
        }
        return newIdx;
    }
}

// top.forEach((binIdx, topIdx) => {
//     if(this.isOctaveTooHigh(binIdx, allBins)) {
//         top.splice(topIdx, 1);
//     }
// });