# TouchDesigner CHOP Execute: generateLines
#
# Takes an input list of point coordinates in a grid formation, produces output
# set of point-pairs to be drawn as connected segments across each grid row and
# down each column
def onOffToOn(channel, sampleIndex, val, prev):	
	grid  = op('waveGrid')
	lines  = op('lineSegments_DAT')
	gridRes = op('gridResolution')

	rows = int(gridRes['y'].eval())
	cols = int(gridRes['x'].eval())

	# Start at row 1 for table output, row 1 = labels 
	lineCount = 1

	# Warning: output table size is set in grid generator

	# Generate line segments across each row
	for i in range(rows):
		for j in range(cols - 1):
			lines[lineCount, 0] = grid['x'][(i * cols) + j]
			lines[lineCount, 1] = grid['y'][(i * cols) + j] 
			lines[lineCount, 2] = grid['x'][(i * cols) + j + 1]
			lines[lineCount, 3] = grid['y'][(i * cols) + j + 1]
			lineCount += 1

	# Generate line segments down each column
	for j in range(cols):
		for i in range(rows - 1):
			lines[lineCount, 0] = grid['x'][(i * cols) + j]
			lines[lineCount, 1] = grid['y'][(i * cols) + j]
			lines[lineCount, 2] = grid['x'][((i + 1) * cols) + j]
			lines[lineCount, 3] = grid['y'][((i + 1) * cols) + j]
			lineCount += 1

	return

def whileOn(channel, sampleIndex, val, prev):
	return

def onOnToOff(channel, sampleIndex, val, prev):
	return

def whileOff(channel, sampleIndex, val, prev):
	return

def onValueChange(channel, sampleIndex, val, prev):
	return
	