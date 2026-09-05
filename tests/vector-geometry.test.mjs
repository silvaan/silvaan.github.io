import test from 'node:test';
import assert from 'node:assert/strict';
import { dotGeometry, componentPlanes } from '../src/lib/vector-geometry.ts';
const v = (x, y, z = 0) => ({ x, y, z });
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);

test('dot rectangle collapses for perpendicular vectors in 2D and 3D', () => {
  for (const [a, b] of [[v(2,0), v(0,1.8)], [v(2,3), v(-3,2)], [v(1,2,3), v(2,-1,0)]]) {
    const g = dotGeometry(a,b);
    assert.equal(g.projection, 0);
    assert.equal(g.area, 0);
    assert.equal(g.angle, 90);
  }
});
test('90-degree slider trigonometric residue is zero, but nearby angles retain area', () => {
  const at = (degrees) => dotGeometry(v(2,0), v(3*Math.cos(degrees*Math.PI/180),3*Math.sin(degrees*Math.PI/180)));
  assert.equal(at(90).area,0);
  assert.ok(at(89.9).product > 0);
  assert.ok(at(90.1).product < 0);
  close(at(89.9).area, at(90.1).area);
});
test('rectangle area is unsigned while projection supplies the product sign', () => {
  for (const [b, expected] of [[v(3,0),6], [v(-3,0),-6]]) {
    const g=dotGeometry(v(2,0),b);
    assert.equal(g.product,expected);
    assert.equal(g.area,6);
    close(g.lengthA*Math.abs(g.projection),g.area);
  }
  assert.equal(dotGeometry(v(0,0),v(2,3)).angle,null);
});
test('each cross component equals the shoelace area of its projected polygon', () => {
  const a=v(1.5,1.3,0), b=v(.4,-.5,1.5);
  const planes=componentPlanes(a,b);
  planes.forEach((p,i) => {
    const polygon=[[0,0],p.a,[p.a[0]+p.b[0],p.a[1]+p.b[1]],p.b];
    const area=polygon.reduce((sum,q,j)=>{const next=polygon[(j+1)%4];return sum+q[0]*next[1]-q[1]*next[0];},0)/2;
    close(p.area,area);
    close(p.area,[1.95,-2.25,-1.27][i]);
    close(componentPlanes(b,a)[i].area,-p.area);
  });
});
test('flat xy patch has only z area; parallel vectors collapse every component', () => {
  assert.deepEqual(componentPlanes(v(2,0),v(0,3)).map(p=>p.area),[0,0,6]);
  assert.deepEqual(componentPlanes(v(1,2,3),v(2,4,6)).map(p=>p.area),[0,0,0]);
});
