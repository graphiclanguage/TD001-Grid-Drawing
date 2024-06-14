# TouchDesigner CHOP Execute: generateGrid
#
# Outputs a table of point coordinates in an evenly distributed grid across the
# space: x=[0,1], y=[0,1]. Centred at [0.5,0.5], distributed up to horz/vert border
def onOffToOn(channel, sampleIndex, val, prev):		
	points  = op('baseGrid')
	lines   = op('lineSegments_DAT')
	params  = op('gridParams')
	gridRes = op('gridResolution')
	
	rows = int(gridRes['y'].eval())
	cols = int(gridRes['x'].eval())

	pointLabels = [ 'x',  'y' ]
	lineLabels  = [ 'x0', 'y0', 'x1', 'y1' ]

	for i in range(len(pointLabels)):
		points[0, i] = pointLabels[i]

	for i in range(len(lineLabels)):
		lines[0, i] = lineLabels[i]

	# Warning: Coupled to line drawing algorithm, this number of rows is the
	# number of segments generated currently 
	lines.setSize((rows * (cols - 1)) + (cols * (rows - 1)) + 1, len(lineLabels))
	points.setSize((rows * cols) + 1, len(pointLabels))

	borderVert = float(params['borderVert'].eval())
	borderHorz = float(params['borderHorz'].eval())

	# Generate grid of points, write out point coordinates to output table
	for i in range(rows):
		for j in range(cols):
			x = ((j / (cols - 1)) * (1 - (2 * borderHorz))) + borderHorz
			y = ((i / (rows - 1)) * (1 - (2 * borderVert))) + borderVert

			points.appendRow([ x, y ])

	return

def whileOn(channel, sampleIndex, val, prev):
	return

def onOnToOff(channel, sampleIndex, val, prev):
	return

def whileOff(channel, sampleIndex, val, prev):
	return

def onValueChange(channel, sampleIndex, val, prev):
	return
	