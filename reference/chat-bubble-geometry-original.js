    function roundedBubblePath(width, height, radius) {
        return `M${radius} .5H${width - radius}Q${width - .5} .5 ${width - .5} ${radius}`
            + `V${height - radius}Q${width - .5} ${height - .5} ${width - radius} ${height - .5}`
            + `H${radius}Q.5 ${height - .5} .5 ${height - radius}V${radius}Q.5 .5 ${radius} .5Z`;
    }
    function tailedBubblePath(width, height, radius, tailWidth) {
        const bodyLeft = tailWidth;
        const totalWidth = width + tailWidth;
        const shoulder = Math.min(bodyLeft + radius, totalWidth - radius);
        const curveTop = Math.max(radius + 1, height - 14);
        return `M${shoulder} .5H${totalWidth - radius}Q${totalWidth - .5} .5 ${totalWidth - .5} ${radius}`
            + `V${height - radius}Q${totalWidth - .5} ${height - .5} ${totalWidth - radius} ${height - .5}`
            + `H${bodyLeft + 9}C${bodyLeft + 5.5} ${height - .5} ${bodyLeft + 3.2} ${height - 1.5} ${bodyLeft + 2} ${height - 3.6}`
            + `C${bodyLeft - .3} ${height - 1.3} ${bodyLeft - 3.5} ${height - .1} .5 ${height - .5}`
            + `C4.5 ${height - 3.2} 6.8 ${height - 7.2} ${bodyLeft - .5} ${curveTop}`
            + `V${radius}Q${bodyLeft - .5} .5 ${shoulder} .5Z`;
    }
