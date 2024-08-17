import math
al = ([[486496.6252233386, 2763269.4702775776], [486493.621402964, 2763253.1908470094]], [[486501.4617715329, 2763295.682314694], [486497.5324899182, 2763274.3872770965]])

def nearest_point_from_line(pt, ind, lines, tol):
    dists = []

    for ind1, l in enumerate(lines):
        if ind1 == ind:
            continue

        dis = magnitude(pt, l[0])
        dis1 = magnitude(pt, l[1])
        
        if dis > dis1:
            dists.append([dis1, l[0]])

        if dis < dis1:
            dists.append([dis, l[1], ind1])

    dists.sort(key=lambda x: x[0])

    if tol+0.1 > dists[0][0] > tol:
        return dists[0]

def magnitude(P1: list, P2: list) -> float:
    """
    function to calculate the distance between two points.
    :param
        P1: first point coordinates. e.g. [1, 2]
        P2: second point coordinates. e.g. [5, 5]
    """
    X = P2[0] - P1[0]
    Y = P2[1] - P1[1]
    #calculate distance.
    dist = math.sqrt((X *X )+(Y * Y))
    return dist

a, b = [486496.6252233386, 2763269.4702775776], [486493.621402964, 2763253.1908470094]
nearest_point_from_line(a, 0, al, 5)
ind = 33;tolerance=5
pCord = get_linecoords(pl.geometry()); spnt = pCord[0];stpnt = pCord[-1];n_spnt = nearest_point_from_line(spnt, ind, all_lines, tolerance);n_stpnt = nearest_point_from_line(stpnt, ind, all_lines, tolerance)

for ind, pl in enumerate(lFeatures):
    pCord = lines[ind]
    spnt = pCord[0]
    stpnt = pCord[-1]
    n_spnt = nearest_point_from_line(spnt, ind, lines, tolerance)
    n_stpnt = nearest_point_from_line(stpnt, ind, lines, tolerance)
    
if n_stpnt:
    p1 = QgsPointXY(spnt[0], spnt[1])
    p2 = QgsPointXY(n_stpnt[0], n_stpnt[1])
    stpnt = n_stpnt
    lnstng = QgsGeometry.fromMultiPolylineXY([[p1, p2]])
    pl.setGeometry(lnstng)
    #layer.updateFeature(pl)
    lines[ind] = [p1, p2]
        
if n_spnt:
    p1 = QgsPointXY(n_spnt[0], n_spnt[1])
    p2 = QgsPointXY(stpnt[0], stpnt[1])
    spnt = n_spnt
    lnstng = QgsGeometry.fromMultiPolylineXY([[p1, p2]])
    pl.setGeometry(lnstng)
    layer.updateFeature(pl)
    lines[ind] = [p1, p2]
        
    if not n_stpnt and not n_spnt:
        layer.select(pl.id())
    break