/*
 * TouchDesigner GLSL Pixel Shader: drawLines
 * 
 * Reads input array of point-coordinate-pairs and draws line segments  
 * connecting them of thickness 'lineThickness'. If consecutive line segments
 * are connected, produce a smooth arc between segments. Point coordinates are
 * in the space x=[0,resX], y=[0,resY]
 */
 
/*
 * Max static storage allocated for input array of point pairs
 * 
 * Note from Documentation: If you are using Uniform Arrays, you can use the
 * built-in variable int(var('SYS_GFX_GLSL_MAX_UNIFORMS')) to get an idea of how
 * many values you can pass to the shader.
 */
#define MAX_LINES 256

/* NOTE: Points (A, B) are decomposed from lineSegments to draw as line segments
 *   vec2 pA = lineSegments[i].xy;
 *   vec2 pB = lineSegments[i].zw;
 */

/* INPUTS from TouchDesigner: */
uniform int   numLinesIn; /* Count of point pairs to draw as line segments */
uniform vec4  lineSegments[MAX_LINES]; /* All point pairs of line segments */
uniform float aliasWeight; /* Weight of neighbouring pixel smoothing [0-1] */
uniform float curveRatio;  /* Portion of connected line segments to taper */
uniform float lineThickness;
uniform vec4  lineColor;

/* OUTPUTS to TouchDesigner: */
out vec4 fragColor; /* Pixel output (r, g, b, a) */

/* Function Prototypes: */
vec4 getPixel(vec2 uv);
vec4 drawConnectedSegments(vec2 P, vec2 A, vec2 B, vec2 C, bool connected);
float lineSegment(vec2 P, vec2 A, vec2 B, float r);
float arcSegment(vec2 P, vec2 A, vec2 B, vec2 C, float r);
vec2 intersection2D(vec2 p1, vec2 d1, vec2 p2, vec2 d2);

void main()
{
	/* Compute in coordinates defined by output aspect */
	vec2 uv = vUV.st * uTDOutputInfo.res.zw;
	vec4 colorOut;

	if (aliasWeight > 0)
	{
		colorOut = vec4(0.0);
        for (int i = -1; i <= 1; i++) 
		{
			for (int j = -1; j <= 1; j++)
			{
				if (i != 0 && j != 0) {
					vec2 uvA = uv + (vec2(i, j)/2.0);
					colorOut += getPixel(uvA);
				}
			}
			colorOut += getPixel(uv) * 9 * (1 - aliasWeight);
			colorOut /= 9;
        }
		colorOut += getPixel(uv);
	}
	else
	{
		colorOut = getPixel(uv);
	}

	fragColor = TDOutputSwizzle(colorOut);
}

/**
 * getPixel
 *
 * Abstraction of pixel calculation in order to support per-pixel anti-aliasing.
 * Iterates line segments to draw them in their respectively prescribed styles.
 */
vec4 getPixel(vec2 uv)
{
	vec4 outColor = vec4(0);

	/* Max out at smaller of: (max allocated count, requested count) */
	int numLines = (numLinesIn < MAX_LINES) ? numLinesIn : MAX_LINES;

	/* Iterate all line segments */
	for (int i = 0; i < numLines; i++)
	{
		vec2 A = lineSegments[i].xy;
		vec2 B = lineSegments[i].zw;
		vec2 C = (i + 1 < numLines) ? lineSegments[i + 1].xy : vec2(0);
		vec2 D = (i + 1 < numLines) ? lineSegments[i + 1].zw : vec2(0);

		bool connected = (abs(B.x - C.x) < 0.1) && (abs(B.y - C.y) < 0.1);

		outColor += drawConnectedSegments(uv, A, B, D, connected);
	}

	return outColor;
}

vec2 A_prime, C_prime, last_C_prime;
bool lastSegmentConnected = false;

/**
 * drawConnectedSegments
 *
 * At point P, draws line segment A-B. If connected to proceeding segment B-C,
 * instead draws A-B-C with an arcing transition between segments
 */
vec4 drawConnectedSegments(vec2 P, vec2 A, vec2 B, vec2 C, bool connected)
{
	vec4 outColor = vec4(0);

	/* If next segment is connected: draw rounded edge between segments */
	if (connected)
	{	
		/* Calculate arc start and end points: Take a fraction from the 
			* smallest of two lines AB, BC. Find points on each line equal
			* distance from B: A_prime, C_prime
			*/
		float lenAB = length(A - B);
		float lenBC = length(B - C);

		if (lenAB > lenBC)
		{
			A_prime = mix(B, A, curveRatio * (lenBC / lenAB));
			C_prime = mix(B, C, curveRatio);
		}
		else
		{
			A_prime = mix(B, A, curveRatio);
			C_prime = mix(B, C, curveRatio * (lenAB / lenBC));
		}

		/* Compute normal directional vectors to A'B and C'B */
		vec2 A_prime_B_n = vec2(A_prime.y - B.y, B.x - A_prime.x);
		vec2 C_prime_B_n = vec2(C_prime.y - B.y, B.x - C_prime.x);
		
		/* Find intersection point of normal vectors: this is the arc centre */
		vec2 arcCentre = intersection2D(A_prime, A_prime_B_n, 
										C_prime, C_prime_B_n);

		/* Draw arc segment using start, centre, end */
		float intensity = arcSegment(P, A_prime, C_prime, arcCentre, lineThickness);

		outColor = mix(outColor, lineColor, intensity);

		/* If the previous line approaching A has a rounded edge, draw the next
		 * from end of arc instead of point A
		 */
		if (lastSegmentConnected)
		{
			A = last_C_prime;
		}

		/* Draw straight segment of line */
		intensity = lineSegment(P, A, A_prime, lineThickness);

		outColor = mix(outColor, lineColor, intensity);

		last_C_prime = C_prime;

		lastSegmentConnected = true;
	}
	/* Next segment is not connected: draw segment to end at point B */
	else
	{
		/* If the previous line approaching A has a rounded edge, draw the next
		 * from end of arc instead of point A
		 */
		if (lastSegmentConnected)
		{
			A = last_C_prime;
		}

		/* Calculate extent which pixel falls inside of line segment */
		float intensity = lineSegment(P, A, B, lineThickness);

		/* Lay over top of all previous lines */ 
		outColor = mix(outColor, lineColor, intensity);

		lastSegmentConnected = false;
	}

	return outColor;
}

/**
 * intersection2D
 *
 * Calculates intersection point of two lines A and B, defined by points and
 * direction vectors. Assumes lines are not parallel, check before call
 */
vec2 intersection2D(vec2 pA, vec2 dA, vec2 pB, vec2 dB)
{
    vec2 tangentA = vec2(-dA.y, dA.x);
    
    float distanceToLineA = dot(pB - pA, tangentA);
    float pBDistance = distanceToLineA / dot(-tangentA, dB);
    
    return (pBDistance * dB) + pB;
}

/**
 * lineSegment
 *
 * At point P, draws line segment A-B with thickness r
 */
float lineSegment(vec2 P, vec2 A, vec2 B, float r)
{
	vec2 g = B - A;
	vec2 h = P - A;
	float d = length(h - g * clamp(dot(g, h) / dot(g, g), 0.0, 1.0));
	return smoothstep(r, 0.9 * r, d);
}

/**
 * arcSegment
 * 
 * At point P, draws arc segment A-B around centre C with thickness r.
 * Draw using composite of 4 layers: 
 *   (Outer circle - Inner circle) * Arc Boundary A * Arc Boundary C
 */
float arcSegment(vec2 P, vec2 A, vec2 B, vec2 C, float r)
{
	float intensity, distance, comp[4];
	float radius = length(C - A);

	distance = length(C - P) - radius;
	comp[0] = smoothstep(- r, - 0.9 * r, distance);

	distance = length(C - P) - radius;
	comp[1] = smoothstep(0.9 * r, r, distance);

	/* Produce a boundary line along the ends of the arc segment */ 
	vec2 AC = C - A;
	vec2 BC = C - B;

	/* Normal vector to calculate point distance to boundary line */
 	vec2 ACn = vec2(-AC.y, AC.x);
	vec2 BCn = vec2(-BC.y, BC.x);

	/* */
	float distBoundaryA, distBoundaryB, orientationA, orientationB;

    distBoundaryA = dot(P - A, ACn);
	distBoundaryB = dot(P - B, BCn);
	orientationA  = dot(B - A, ACn) > 0 ? 1.0 : -1.0;
	orientationB  = dot(A - B, BCn) > 0 ? 1.0 : -1.0;

	/* */
	// comp[2] = distBoundaryA * orientationA > 0 ? 1.0 : 0.0;
	comp[2] = smoothstep(-r / 2, r / 2, distBoundaryA * orientationA);
	comp[3] = distBoundaryB * orientationB > 0 ? 1.0 : 0.0;

	// intensity = (comp[0] - comp[1]) * comp[2] * comp[3]; 
	intensity = (comp[0] - comp[1]) * comp[2] * comp[3]; 

	return intensity;
}
