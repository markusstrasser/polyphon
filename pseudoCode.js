
loop () {

    currBinIdx = pitchDetect.heightsBins;
    correctBinIdx = correctToLowestPeak(currBin, spectrogramData)

    for (let box of boxes) {
        rangeBins = binsForMidi(midi, hzPerBin)
        if (Math.abs(box.index - correctBinIdx) > rangeBins) { //if you're not p
            box.alpha = 0.2;
        }
    }
}

function binsForMidi(midi, hzPerBin) {
    const freqencyRangeForNote = hzToMidi(midi+0.5) - hzToMidi(midi-0.5);
    return freqencyRangeForNote / hzPerBin; //binCount for the Range of the Note

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

function findClusters(bins) {
    const copy = bins.slice();

    const positions = [
        {name: ""}
    ]






    for (let bin of copy) {

    }
}