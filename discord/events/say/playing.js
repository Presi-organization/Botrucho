module.exports = {
    async execute(_, oldState, newState) {
        console.log('Audio player is in the Playing state!');
        console.log(`Audio player transitioned from ${ oldState.status } to ${ newState.status }`);
    }
}
