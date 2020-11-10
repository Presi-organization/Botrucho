const handleVocalMessage = (userOrMember, speaking) => {
    console.log(userOrMember.displayName || userOrMember.username, "is talking?", speaking);
}

module.exports = { handleVocalMessage }